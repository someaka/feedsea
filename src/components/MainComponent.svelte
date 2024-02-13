<script>
	import { onDestroy } from 'svelte';
	import isLoggedIn from './stores/auth';
	import Feeds from './feeds/Feeds.svelte';
	import { callServerCleanUp } from '$lib/api';

	onDestroy(() => {
		callServerCleanUp();
	});

	// Reactive statement to watch the isLoggedIn store
	$: mainWrapperClass = $isLoggedIn ? 'slide-in' : '';
</script>

<div class="main-wrapper {mainWrapperClass}">
	<Feeds />
</div>

<style>
	.main-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transform: translateX(100%);
		transition: transform 0.5s ease-in-out;
	}

	.slide-in {
		animation: slideIn 0.5s forwards;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}
</style>
