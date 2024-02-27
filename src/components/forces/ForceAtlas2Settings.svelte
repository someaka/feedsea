<script lang="ts">
	import { onMount } from 'svelte';
	import { atlas2PanelSettings } from './forceSettingsStore';
	import { updateForceSettings } from '../graph/graphologySigma';
	import Slider, { type ScaleType } from './slider';
	import type { ForceAtlas2Settings } from 'graphology-layout-forceatlas2';

	const descriptions: Record<string, string> = {
		linLogMode: 'Toggles the linear logarithmic mode.',
		outboundAttractionDistribution: 'Controls the distribution of outbound attraction.',
		adjustSizes: 'Adjusts node sizes.',
		edgeWeightInfluence: 'Influence of the edge weight.',
		scalingRatio: 'Ratio for scaling.',
		strongGravityMode: 'Enables or disables strong gravity mode.',
		gravity: 'Amount of gravitational pull.',
		slowDown: 'Controls the slowdown rate.',
		barnesHutOptimize: 'Toggles the Barnes-Hut optimization.',
		barnesHutTheta: 'Theta parameter for the Barnes-Hut optimization.'
	};

	let sliders: Slider<ForceAtlas2Settings>[] = [];
	// Update the type definition here to include the description property
	let toggles: {
		id: keyof ForceAtlas2Settings;
		label: string;
		value: boolean;
		description: string;
	}[] = [];

	onMount(() => {
		const unsubscribe = atlas2PanelSettings.subscribe((settings) => {
			sliders = [];
			toggles = [];
			Object.entries(settings).forEach(([key, value]) => {
				const label = key;
				const description = descriptions[key] || ''; // Use the description from the descriptions object or an empty string
				if (typeof value === 'boolean') {
					toggles.push({ id: key as keyof ForceAtlas2Settings, label, value, description }); // Now includes the description
				} else {
					const sliderConfig = { min: 0, max: 10, precision: 2, scaleType: 'linear' as ScaleType };
					sliders.push(
						new Slider<ForceAtlas2Settings>(
							key as keyof ForceAtlas2Settings,
							label,
							description,
							value as number,
							sliderConfig
						)
					);
				}
			});
		});

		return () => {
			unsubscribe(); // Cleanup function to unsubscribe
		};
	});

	function handleSettingChange(event: Event, id: keyof ForceAtlas2Settings) {
		const target = event.target as HTMLInputElement;
		const newValue = target.type === 'checkbox' ? target.checked : parseFloat(target.value);
		if (typeof newValue === 'boolean') {
			toggles = toggles.map((toggle) =>
				toggle.id === id ? { ...toggle, value: newValue } : toggle
			);
		} else {
			sliders = sliders.map((slider) =>
				slider.id === id
					? new Slider(slider.id, slider.label, slider.description, newValue, slider.config)
					: slider
			);
		}
		updateSettings();
	}

	function updateSettings() {
		const updatedSettings: ForceAtlas2Settings = sliders.reduce((acc, slider) => {
			acc[slider.id] = slider.value as any;
			return acc;
		}, {} as ForceAtlas2Settings);

		toggles.forEach((toggle) => {
			updatedSettings[toggle.id] = toggle.value as any;
		});

		atlas2PanelSettings.set(updatedSettings);
		updateForceSettings(updatedSettings);
	}

	let easterEggActive = Math.random() < 0.1;
</script>

<div id="forceSettings" class:easter-egg={easterEggActive}>
	{#each sliders as slider}
		<div class="slider-container">
			<div class="slider-header">
				<label for="{slider.id}Slider" class="slider-title">{slider.label}:</label>
				<small class="slider-explanation">{slider.description}</small>
			</div>
			<div class="slider-with-output">
				<input
					type="range"
					id="{slider.id}Slider"
					class="slider"
					bind:value={slider.value}
					min={slider.config.min}
					max={slider.config.max}
					step={slider.config.precision}
					on:input={(event) => handleSettingChange(event, slider.id)}
				/>
				<div class="slider-min-max">
					<span class="slider-min">{slider.config.min}</span>
					<output for="{slider.id}Slider" class="slider-output">{slider.value}</output>
					<span class="slider-max">{slider.config.max}</span>
				</div>
			</div>
		</div>
	{/each}
	{#each toggles as toggle}
		<div class="toggle-container">
			<span class="toggle-title">{toggle.label}:</span>
			<span class="toggle-description">{toggle.description}</span>
			<input
				type="checkbox"
				id="{toggle.id}Toggle"
				class="toggle"
				bind:checked={toggle.value}
				on:change={(event) => handleSettingChange(event, toggle.id)}
			/>
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

	/* Additional CSS for styling checkboxes as toggles */
	.toggle {
		-webkit-appearance: none;
		appearance: none;
		width: 50px;
		height: 25px;
		background-color: #ddd;
		border-radius: 25px;
		position: relative;
		outline: none;
		cursor: pointer;
		transition: background-color 0.3s;
	}

	.toggle:checked {
		background-color: #4cd964;
	}

	.toggle:before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 21px;
		height: 21px;
		border-radius: 50%;
		background-color: white;
		transition: transform 0.3s;
	}

	.toggle:checked:before {
		transform: translateX(25px);
	}

	.toggle-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.toggle-title,
	.toggle-description {
		margin-right: 10px; /* Adjust spacing as needed */
	}
</style>
