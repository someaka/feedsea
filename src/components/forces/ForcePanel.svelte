<script lang="ts">
	import { onMount } from 'svelte';
	import { forcePanelSettings } from './forceSettingsStore';
	import { updateForceSettings } from '../graph/graphologySigma';
	import defaultGraphSettings from './defautGraphSettings';

	import type { GraphSettings } from '$lib/types';

	type ScaleType = 'log' | 'linear';
	type SliderId = keyof GraphSettings;

	interface SliderConfig {
		min: number;
		max: number;
		precision: number;
		scaleType: ScaleType;
	}

	interface SliderType {
		id: SliderId;
		label: string;
		description: string;
		value: number;
		config: SliderConfig;
	}

	class Slider implements SliderType {
		id: SliderId;
		label: string;
		description: string;
		value: number;
		config: SliderConfig;

		constructor(
			id: SliderId,
			label: string,
			description: string,
			defaultValue: number,
			config: SliderConfig
		) {
			this.id = id;
			this.label = label;
			this.description = description;
			this.config = config;
			this.value = Slider.calculateScaledValue(defaultValue, config);
		}

		static calculateScaledValue(value: number, config: SliderConfig): number {
			return config.scaleType === 'log'
				? (Math.log(value) - Math.log(config.min)) /
						((Math.log(config.max) - Math.log(config.min)) / 100)
				: value;
		}

		static calculateOriginalValue(scaledValue: number, config: SliderConfig): number {
			let originalValue;
			if (config.scaleType === 'log') {
				originalValue = Math.exp(
					Math.log(config.min) + scaledValue * ((Math.log(config.max) - Math.log(config.min)) / 100)
				);
			} else {
				originalValue = scaledValue;
			}
			return Number(originalValue.toFixed(config.precision));
		}
	}

	let sliders: Slider[] = [
		new Slider(
			'gravity',
			'Gravity',
			'Higher gravity pulls nodes closer to center, lower lets them drift apart.',
			defaultGraphSettings.gravity,
			{
				min: 0.00001,
				max: 10,
				precision: 5,
				scaleType: 'log'
			}
		),
		new Slider(
			'repulsion',
			'Repulsion',
			'Higher repulsion spreads nodes further apart, lower brings them closer.',
			defaultGraphSettings.repulsion,
			{
				min: 0.0001,
				max: 10,
				precision: 5,
				scaleType: 'log'
			}
		),
		new Slider(
			'attraction',
			'Attraction',
			'Higher attraction increases the force pulling connected nodes together.',
			defaultGraphSettings.attraction,
			{
				min: 0.000001,
				max: 0.1,
				precision: 8,
				scaleType: 'log'
			}
		),
		new Slider(
			'inertia',
			'Inertia',
			'Higher inertia maintains node velocity, lower inertia slows nodes down faster.',
			defaultGraphSettings.inertia,
			{
				min: 0,
				max: 5,
				precision: 1,
				scaleType: 'linear'
			}
		),
		new Slider(
			'maxMove',
			'Max Move',
			'Higher max move allows nodes to move further in each iteration.',
			defaultGraphSettings.maxMove,
			{
				min: 0,
				max: 5,
				precision: 1,
				scaleType: 'linear'
			}
		)
	];



	onMount(() => {
		const unsubscribe = forcePanelSettings.subscribe((settings) => {
			sliders = sliders.map((slider) => {
				const storedValue = settings[slider.id];
				return new Slider(slider.id, slider.label, slider.description, storedValue, slider.config);
			});
		});

		return () => {
			unsubscribe();
		};
	});

	function updateSettings() {
		const settings: GraphSettings = sliders.reduce((acc, slider) => {
			acc[slider.id] = Slider.calculateOriginalValue(slider.value, slider.config);
			return acc;
		}, {} as GraphSettings);
		updateForceSettings(settings);
		forcePanelSettings.set(settings);
	}

</script>

<div id="forceSettings">
	<h3>Force Settings</h3>
	{#each sliders as slider}
		<div class="slider-container">
			<div class="slider-header">
				<label for="{slider.id}Slider" class="slider-title">{slider.label}:</label>
				<small class="slider-explanation">{slider.description}</small>
			</div>

			<div class="range-slider">
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

    .slider-min-max, .slider-output {
        user-select: none;
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		margin-top: -0.5rem;
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
	}
</style>
