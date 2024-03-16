<script lang="ts">
	import { fly } from 'svelte/transition';
	import { isForceAtlas } from '$lib/stores/forces';
	import { switchLayout } from '../graph/SigmaGraphUpdate';
	import ForceLayoutSettings from './ForceLayoutSettings.svelte';
	import ForceAtlas2Settings from './ForceAtlas2Settings.svelte';
	import Slider from './slider';
	import { linksPercentile } from '$lib/stores/stores';

	const toggleForce = () => {
		switchLayout();
	};
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') toggleForce();
	};
	const flyParams = { x: -100, duration: 500 };

	const savedValue = localStorage.getItem('linksPercentile');
    let savedPercentile = savedValue ? JSON.parse(savedValue) : 0.5;
    let linksPercentileSlider = new Slider<number>(
        'linksPercentile',
        'Links Percentile',
        'Adjusts the percentile of links filtered.',
        savedPercentile, 
		{
            min: 0,
            max: 1,
            precision: 3,
            scaleType: 'linear'
        }
    );

    function updateLinksPercentile() {
        const originalValue = Slider.calculateOriginalValue(linksPercentileSlider.value, linksPercentileSlider.config);
        linksPercentile.set(originalValue);
        localStorage.setItem('linksPercentile', JSON.stringify(originalValue));
    }

	let easterEggActive = Math.random() < 0.1;
</script>

<div class="force-panel">
	<h3>
		<span
			class="force-clickable"
			tabindex="0"
			on:click={toggleForce}
			on:keydown={handleKeydown}
			role="button">Force Atlas</span
		>
		<div class="title-container">
			{#if !$isForceAtlas}
				<span in:fly={flyParams} out:fly={flyParams}>2</span>
			{/if}
		</div>
	</h3>

	<div class="slider-container">
		<div class="slider-header">
			<label for="linksPercentileSlider" class="slider-title">{linksPercentileSlider.label}:</label>
			<small class="slider-explanation">{linksPercentileSlider.description}</small>
		</div>
		<div class="range-slider" class:easter-egg={easterEggActive}>
			<input
				type="range"
				id="linksPercentileSlider"
				bind:value={linksPercentileSlider.value}
				min={linksPercentileSlider.config.min}
				max={linksPercentileSlider.config.max}
				step="any"
				class="slider"
				on:input={updateLinksPercentile}
			/>
			<div class="slider-min-max">
				<span class="slider-min">{linksPercentileSlider.config.min}</span>
				<output for="linksPercentileSlider" id="linksPercentileOutput" class="slider-output">
					{Slider.calculateOriginalValue(linksPercentileSlider.value, linksPercentileSlider.config)}
				</output>
				<span class="slider-max">{linksPercentileSlider.config.max}</span>
			</div>
		</div>
	</div>

	{#if $isForceAtlas}
		<ForceLayoutSettings {easterEggActive} />
	{:else}
		<ForceAtlas2Settings {easterEggActive} />
	{/if}
</div>

<style>
	.force-panel {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}
	.force-clickable {
		cursor: pointer;
		color: inherit;
		text-decoration: none;
		outline: none;
	}
	.title-container {
		display: inline-flex;
		align-items: center;
	}

	.slider-container {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
	}

	.slider-header {
		display: flex;
		justify-content: left;
		align-items: center; /* Ensures vertical centering */
	}

	.slider-title {
		display: inline-block;
		margin-right: 0.5rem; /* Adds space between title and description */
		font-weight: 500; /* Less bold than 'bold', adjust as needed */
	}

	.slider-explanation {
		display: inline-block;
		flex-grow: 1; /* Allows the description to take up remaining space */
	}

	.slider-min-max {
		user-select: none;
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		margin-top: -0.5rem;
		position: relative;
		z-index: -1;
	}
	.slider-output {
		user-select: none;
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		margin-top: -0.5rem;
		z-index: -1;
	}

	.slider {
		width: 100%;
		height: 4px;
	}

	.slider-output {
		display: block;
		text-align: center;
		padding: 2px 4px; /* Slight padding around the text */
		background-color: #c7b5b51c; /* Slightly darker background */
		border-radius: 4px; /* Rounded corners for the box */
		width: fit-content; /* Adjust width to content */
		margin-top: 0.5px;
		margin-left: auto; /* Center the box */
		margin-right: auto;
		margin-bottom: 5px;
		z-index: -1;
	}

	:root {
		--slider-track-width: 100%;
		--slider-track-height: 4px;
		--slider-track-background-default: linear-gradient(to right, #0080ca34, #417ff169);
		--slider-track-border-radius: 4px;
		--slider-thumb-width: 15px;
		--slider-thumb-height: 15px;
		--slider-thumb-background: #fff;
		--slider-thumb-border: 2px solid #007bff;
		--slider-thumb-border-radius: 50%;
		--slider-thumb-box-shadow: 0 0 4px #007bff;
		--easter-slider-track-background: linear-gradient(to right, #ffd9007a, #007bff85);
	}

	/* Default slider track styling */
	.slider::-webkit-slider-runnable-track {
		width: var(--slider-track-width);
		height: var(--slider-track-height);
		background: var(--slider-track-background-default);
		border-radius: var(--slider-track-border-radius);
	}

	.slider::-moz-range-track {
		width: var(--slider-track-width);
		height: var(--slider-track-height);
		background: var(--slider-track-background-default);
		border-radius: var(--slider-track-border-radius);
	}

	.slider::-ms-track {
		width: var(--slider-track-width);
		height: var(--slider-track-height);
		background: var(--slider-track-background-default);
		border-radius: var(--slider-track-border-radius);
		border-color: transparent;
		color: transparent;
	}

	/* Easter egg styling */
	.easter-egg .slider::-webkit-slider-runnable-track {
		background: var(--easter-slider-track-background) !important;
	}
	.easter-egg .slider::-moz-range-track {
		background: var(--easter-slider-track-background) !important;
	}
	.easter-egg .slider::-ms-track {
		background: var(--easter-slider-track-background) !important;
	}

	/* Slider thumb styling */
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		margin-top: -6px; /* Adjust based on the slider height to align properly */
		width: var(--slider-thumb-width);
		height: var(--slider-thumb-height);
		background: var(--slider-thumb-background);
		border: var(--slider-thumb-border);
		border-radius: var(--slider-thumb-border-radius);
		box-shadow: var(--slider-thumb-box-shadow);
		z-index: 2;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: var(--slider-thumb-width);
		height: var(--slider-thumb-height);
		background: var(--slider-thumb-background);
		border: var(--slider-thumb-border);
		border-radius: var(--slider-thumb-border-radius);
		box-shadow: var(--slider-thumb-box-shadow);
		z-index: 2;
		cursor: pointer;
	}

	.slider::-ms-thumb {
		width: var(--slider-thumb-width);
		height: var(--slider-thumb-height);
		background: var(--slider-thumb-background);
		border: var(--slider-thumb-border);
		border-radius: var(--slider-thumb-border-radius);
		box-shadow: var(--slider-thumb-box-shadow);
		z-index: 2;
		cursor: pointer;
	}
</style>
