<script>
    import { onDestroy } from "svelte";
    import isLoggedIn from "./stores/auth";
    import LoginForm from "./login/LoginForm.svelte";
    import MainComponent from "./MainComponent.svelte";

    /**
     * @type {boolean}
     */
    let isLoggedInValue;
    $: isLoggedInValue = $isLoggedIn; // Reactive statement to watch the isLoggedIn store

    // Optional: Add a subscription to the store to log changes for debugging purposes
    const unsubscribe = isLoggedIn.subscribe((value) => {
        console.log("isLoggedIn changed:", value);
    });

    onDestroy(() => {
        unsubscribe(); // Clean up the subscription when the component is destroyed
    });
</script>

{#if isLoggedInValue}
    <MainComponent /> <!-- Render the MainComponent component when logged in -->
{:else}
    <LoginForm /> <!-- Render the LoginForm component otherwise -->
{/if}

<style>
    /* Styles for the transition can be added here if needed */
</style>
