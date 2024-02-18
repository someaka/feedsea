<script lang="ts">
	import { onDestroy } from 'svelte';
	import isLoggedIn from '../components/stores/auth';
	import LoginForm from '../components/login/LoginForm.svelte';
	import MainComponent from '../components/MainComponent.svelte';

	let isLoggedInValue: boolean;
	$: isLoggedInValue = $isLoggedIn;

	const unsubscribe = isLoggedIn.subscribe((value) => {
		console.log('isLoggedIn changed:', value);
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

{#if isLoggedInValue}
	<MainComponent />
{:else}
	<LoginForm />
{/if}

<style>
</style>
