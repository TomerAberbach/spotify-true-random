const spotifyRandom = (() => {
    const clientId = 'b61d28d1ed4c49e8ba5d2923ed367262';
    const redirect = 'https://tomeraberba.ch/spotify-true-random';
    const scope = [
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-modify-playback-state',
        'user-library-read',
        'user-read-playback-state'
    ];
    const stateKey = 'state';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    const spotify = new SpotifyWebApi();
    let access;
    let expires;

    function hashParams() {
        const params = {};
        const r = /([^&;=]+)=?([^&;]*)/g,
              q = window.location.hash.substring(1);

        let e;
        while (e = r.exec(q)) {
            params[e[1]] = decodeURIComponent(e[2]);
        }

        return params;
    }

    function login() {
        const state = Array.apply(null, Array(16)).map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
        localStorage.setItem(stateKey, state);

        window.location.href = 'https://accounts.spotify.com/authorize' +
            '?client_id=' + encodeURIComponent(clientId) +
            '&response_type=' + encodeURIComponent('token') +
            '&redirect_uri=' + encodeURIComponent(redirect) +
            '&state=' + encodeURIComponent(state) +
            '&scope=' + encodeURIComponent(scope.join(' '));
    }

    function token() {
        if (access && expires && new Date().getTime() < expires) {
            return access;
        }

        const params = hashParams();

        if (params['state'] && params['access_token'] && params['expires_in'] && params['state'] === localStorage.getItem(stateKey)) {
            localStorage.removeItem(stateKey);
            access = params['access_token'];
            expires = new Date().getTime() + params['expires_in'];
            window.location.hash = '';
            return access;
        }

        login();
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    return {
        token : token,
        playlists : cb => {
            spotify.setAccessToken(token());
            spotify.getUserPlaylists({ limit : 50 }, (err, data) => cb(data));
        },
        tracks : (playlist, cb) => {
            const owner = playlist.split(':')[0];
            const id = playlist.split(':')[1];

            const total = playlist.split(':')[2];
            let i = 0;

            const tracks = [];

            (function f() {
                spotify.setAccessToken(token());
                spotify.getPlaylistTracks(owner, id, {
                    offset : i,
                    limit : 100,
                    fields : 'items(track(uri))'
                }, (err, data) => {
                    data['items'].map(obj => obj['track']['uri']).forEach(obj => tracks.push(obj));
                    i += 100;

                    if (i < total) {
                        f();
                    } else {
                        cb(tracks);
                    }
                });
            })();
        },
        library : cb => {
            spotify.setAccessToken(token());
            spotify.getMySavedTracks({ limit : 50 }, (err, data) => {
                const total = data['total'];
                let i = 50;

                const tracks = data['items'].map(obj => obj['track']['uri']);

                (function f() {
                    spotify.setAccessToken(token());
                    spotify.getMySavedTracks({
                        offset : i,
                        limit : 50,
                    }, (err, data) => {
                        data['items'].map(obj => obj['track']['uri']).forEach(obj => tracks.push(obj));
                        i += 50;

                        if (i < total) {
                            f();
                        } else {
                            cb(tracks);
                        }
                    });
                })();
            });
        },
        devices : cb => {
            spotify.setAccessToken(token());
            spotify.getMyDevices((err, data) => cb(data['devices'].filter(device => !device['is_restricted'])));
        },
        play : tracks => {
            const device = document.getElementById('devices-select').value;

            if (device !== '') {
                shuffle(tracks);
                spotify.setAccessToken(token());
                spotify.play({
                    uris : tracks.slice(0, Math.min(385, tracks.length)),
                    device_id : device
                });
            }
        },
        refresh : () => {
            if (spotifyRandom.token()) {
                spotifyRandom.playlists(playlists => {
                    const select = document.getElementById('playlists-select');

                    for (let i = select.length - 1; i >= 0; i--) {
                        select.remove(i);
                    }

                    playlists['items'].forEach(playlist => {
                        const option = document.createElement('option');
                        option.text = playlist['name'];
                        option.value = playlist['owner']['id'] + ':' + playlist['id'] + ':' + playlist['tracks']['total'];
                        select.add(option);
                    });
                });

                spotifyRandom.devices(devices => {
                    const select = document.getElementById('devices-select');

                    for (let i = select.length - 1; i >= 0; i--) {
                        select.remove(i);
                    }

                    if (devices.length === 0) {
                        const option = document.createElement('option');
                        option.text = 'Please Open Spotify';
                        option.value = '';
                        select.add(option);
                    } else {
                        devices.forEach(device => {
                            const option = document.createElement('option');
                            option.text = device['name'];
                            option.value = device['id'];
                            select.add(option);
                        });
                    }
                });
            }
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => spotifyRandom.refresh());
