// Getting login form data
document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
//creating fetch request
    const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    const messageBox = document.getElementById('message');
//check response
    if (response.ok) {
        messageBox.textContent = 'Connexion réussie !';
        messageBox.style.color = 'green';

//store user ID from response into session cookie then redirect on homepage
        document.cookie = `user_id=${result.user.id}; path=/;`;
        window.location.href = '/pages/map.html';
    } else {
//or display the error message
        messageBox.textContent = result.message || 'Une erreur est survenue.';
    }
});

// getting form result 
document.getElementById('registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const password_confirmation = document.getElementById('password_confirmation').value;
// creating fetch request
    const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, password_confirmation })
    });

    const result = await response.json();

    const messageBox = document.getElementById('message');

//checking response
    if (response.ok) {
        messageBox.textContent = 'Inscription réussie !';
        messageBox.style.color = 'green';

        // then redirect
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
//or display an error
    } else {
        messageBox.textContent = result.message || 'Une erreur est survenue.';
    }
});
