<script lang="ts">
	import { onMount } from 'svelte';
	import { forcePanelSettings } from './forceSettingsStore';
	import { updateForceSettings } from '../graph/graphologySigma';
	import { defaultForceAtlasSettings } from './defaultGraphSettings';
	import Slider from './slider';

	import type { ForceLayoutSettings } from 'graphology-layout-force';

	const loadedSettings = localStorage.getItem('layoutForceSettings');
	const initialSettings = loadedSettings ? JSON.parse(loadedSettings) : defaultForceAtlasSettings;

	let sliders: Slider<ForceLayoutSettings>[] = [
		new Slider<ForceLayoutSettings>(
			'gravity',
			'Gravity',
			'Higher gravity pulls nodes closer to center, lower lets them drift apart.',
			initialSettings.gravity,
			{
				min: 0.00001,
				max: 10,
				precision: 5,
				scaleType: 'log'
			}
		),
		new Slider<ForceLayoutSettings>(
			'repulsion',
			'Repulsion',
			'Higher repulsion spreads nodes further apart, lower brings them closer.',
			initialSettings.repulsion,
			{
				min: 0.0001,
				max: 10,
				precision: 5,
				scaleType: 'log'
			}
		),
		new Slider<ForceLayoutSettings>(
			'attraction',
			'Attraction',
			'Higher attraction increases the force pulling connected nodes together.',
			initialSettings.attraction,
			{
				min: 0.000001,
				max: 0.1,
				precision: 8,
				scaleType: 'log'
			}
		),
		new Slider<ForceLayoutSettings>(
			'inertia',
			'Inertia',
			'Higher inertia maintains node velocity, lower inertia slows nodes down faster.',
			initialSettings.inertia,
			{
				min: 0,
				max: 5,
				precision: 1,
				scaleType: 'linear'
			}
		),
		new Slider<ForceLayoutSettings>(
			'maxMove',
			'Max Move',
			'Higher max move allows nodes to move further in each iteration.',
			initialSettings.maxMove,
			{
				min: 0,
				max: 10,
				precision: 1,
				scaleType: 'linear'
			}
		)
	];

	onMount(() => {
		const unsubscribe = forcePanelSettings.subscribe((settings) => {
			sliders = sliders.map((slider) => {
				const storedValue = settings[slider.id] as number;
				return new Slider<ForceLayoutSettings>(
					slider.id,
					slider.label,
					slider.description,
					storedValue,
					slider.config
				);
			});
		});

		return () => {
			unsubscribe();
		};
	});

	function updateSettings() {
		const settings: ForceLayoutSettings = sliders.reduce((acc, slider) => {
			acc[slider.id] = Slider.calculateOriginalValue(slider.value, slider.config);
			return acc;
		}, {} as ForceLayoutSettings);
		updateForceSettings(settings);
		forcePanelSettings.set(settings);
	}

	let easterEggActive = Math.random() < 0.1;
</script>

<div id="forceSettings">
	{#each sliders as slider}
		<div class="slider-container">
			<div class="slider-header">
				<label for="{slider.id}Slider" class="slider-title">{slider.label}:</label>
				<small class="slider-explanation">{slider.description}</small>
			</div>

			<div class="range-slider" class:easter-egg={easterEggActive}>
				<input
					type="range"
					id="{slider.id}Slider"
					bind:value={slider.value}
					min={slider.config.scaleType === 'log' ? 0 : slider.config.min}
					max={slider.config.scaleType === 'log' ? 100 : slider.config.max}
					step="any"
					class="slider"
					on:input={updateSettings}
				/>
				<div class="slider-min-max">
					<span class="slider-min">{slider.config.min}</span>
					<output for="{slider.id}Slider" id="{slider.id}Output" class="slider-output">
						{Slider.calculateOriginalValue(slider.value, slider.config)}
					</output>
					<span class="slider-max">{slider.config.max}</span>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
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
