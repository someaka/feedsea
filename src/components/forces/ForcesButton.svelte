<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleForces() {
		dispatch('toggleForcePanel');
	}
</script>

<button on:click={handleForces} class="forces-button">Forces</button>

<style>
    .forces-button {
        color: #fff;
        padding: 3px 8px;
        margin-top: -7px;
        margin-right: -4px;
        background-color: transparent;
        font-size: 0.7em;
        border: 2px solid #9156f096; /* Updated border style */
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        outline: none; /* Removes the default focus outline */
    }

    .forces-button:hover {
        border-color: #a16ef2c2; /* Slightly lighter purple on hover */
    }

    .forces-button:focus {
        box-shadow: none
    }
</style>
