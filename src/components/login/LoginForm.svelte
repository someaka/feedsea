<!-- LoginForm.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import axios from 'axios';
	import isLoggedIn from '../stores/auth';

	let formLogin: HTMLFormElement;
	let submitButton: HTMLButtonElement;
	let inputUsername: HTMLInputElement;
	let inputPassword: HTMLInputElement;
	let loginStatusMessage: HTMLElement;

	function displayLoginError(message: string | null) {
		loginStatusMessage.textContent = message;
		loginStatusMessage.classList.add('error');
		loginStatusMessage.style.display = 'block';
	}

	function resetSubmitButton() {
		submitButton.disabled = false;
		submitButton.textContent = 'Submit';
	}

	async function handleLogin(event: Event) {
		event.preventDefault();
		const username = inputUsername.value.trim();
		const password = inputPassword.value.trim();

		if (!username) {
			displayLoginError('Please enter a username.');
			return;
		}

		submitButton.disabled = true;
		submitButton.textContent = 'Loading...';

		try {
			const response = await axios.post(
				'/login',
				{ username, password },
				{ withCredentials: true }
			);
			let loginResult;
			if (response) loginResult = response.data;
			if (loginResult.authenticated) {
				$isLoggedIn = true; // Update the store to reflect a successful login
			}
		} catch (error: any) {
			if (error.response && error.response.status === 401) {
				// Handle the case where the server returns a  401 Unauthorized status
				displayLoginError(error.response.data.error || 'Invalid credentials');
			} else {
				// Handle other potential errors
				displayLoginError('An unexpected error occurred');
			}
			resetSubmitButton();
		}
	}

	onMount(() => {
		formLogin.addEventListener('submit', handleLogin);
	});
</script>

<div class="container">
	<h1>Login to NewsBlur</h1>
	<form class="login-form" bind:this={formLogin}>
		<div class="form-group">
			<label for="inputUsername" class="form-label">Username</label>
			<input
				type="text"
				class="form-control"
				bind:this={inputUsername}
				placeholder="Enter username"
				autocomplete="on"
			/>
		</div>
		<div class="form-group">
			<label for="inputPassword" class="form-label">Password</label>
			<input
				type="password"
				class="form-control"
				bind:this={inputPassword}
				placeholder="Password"
				autocomplete="on"
			/>
		</div>
		<div class="form-group">
			<div class="action-group">
				<button type="submit" class="btn btn-primary" bind:this={submitButton}>Submit</button>
				<div id="loginStatusMessage" class="status-message" bind:this={loginStatusMessage}></div>
			</div>
		</div>
	</form>
</div>

<style>
	.status-message {
		margin-left: 15px; /* Add a small margin to the left */
		margin-bottom: 10px; /* Remove any top margin */
		/* Other styles remain unchanged */
	}
	.action-group {
		display: flex;
		justify-content: left;
		align-items: center; /* Vertically align the button and the message */
	}
	.container {
		max-width: 600px;
		margin: auto;
		padding: 20px;
	}

	.form-group label,
	.form-group .form-control,
	.status-message {
		grid-column: 2 / 3; /* Place input and status message in the second column */
	}

	.status-message {
		margin-top: 10px; /* Add space between button and status message */
	}

	.btn {
		padding: 10px 15px;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn:hover {
		background-color: #0056b3;
	}

	.status-message {
		grid-column: 2 / 3; /* Span the status message across the second column */
		color: red;
		text-align: left;
	}
</style>
