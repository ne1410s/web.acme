((window) => {

    const baseUrl = 'http://localhost:8081';

    const save_token = (token) => sessionStorage.setItem('token', token),
          load_token = () => sessionStorage.getItem('token'),
          wipe_token = () => sessionStorage.removeItem('token');

    async function svc(secure, path, method, json) {

        const url = `${baseUrl}/${path}`,
              headers = { 'content-type': 'application/json' },
              body = JSON.stringify(json);

        if (secure === true) {
            headers['authorization'] = `Bearer ${load_token()}`;
        }

        const response = await fetch(url, { method, headers, body }),
              text = await response.text();

        if (response.status === 401) {
            return show_login(arguments);
        }        
        else if (!response.ok) {
            throw text;
        }

        return JSON.parse(text);
    }

    function show_login(args) {
        Array.from(document.querySelectorAll('.modal.open:not(.login)'))
             .forEach(m => m.classList.remove('open'));
        const modal = document.querySelector('.modal.login');
        modal.classList.add('open');
        modal.querySelector('[type=button]').onclick = () => {
            const username = modal.querySelector('[placeholder=username]').value,
                  password = modal.querySelector('[placeholder=password]').value;
            svc(false, 'login', 'POST', { username, password })
                .then(json => { save_token(json.token); return svc.apply(null, args); })
                .catch(err => console.warn(err));
        }
    }

    window.addEventListener('load', () => {

        wipe_token();

        const accounts_result = svc(true, 'account', 'POST')
            .then(json => console.log('accounts!', json))
            .catch(err => console.warn('aww maaan', err));
    });

    



})(window);