<script lang="ts">
	import Slider from './slider';
	import Toggle from './toggle';
	import { atlas2PanelSettings } from './forceSettingsStore';
	import { defaultForceAtlas2Settings } from './defaultGraphSettings';

	import type { ForceAtlas2Settings } from 'graphology-layout-forceatlas2';
	import { updateForceSettings } from '../graph/SigmaGraphUpdate';

	const loadedSettings = localStorage.getItem('layoutFA2Settings');
	const initialSettings = loadedSettings ? JSON.parse(loadedSettings) : defaultForceAtlas2Settings;

	let sliders: Slider<ForceAtlas2Settings>[] = [
		new Slider<ForceAtlas2Settings>(
			'gravity',
			'Gravity',
			'Higher gravity pulls nodes closer to center, lower lets them drift apart.',
			initialSettings.gravity,
			{ min: 0.001, max: 1000, precision: 5, scaleType: 'log' }
		),
		new Slider<ForceAtlas2Settings>(
			'scalingRatio',
			'Scaling Ratio',
			'Ratio for scaling.',
			initialSettings.scalingRatio,
			{ min: 0.0001, max: 10, precision: 5, scaleType: 'log' }
		),
		new Slider<ForceAtlas2Settings>(
			'slowDown',
			'Slow Down',
			'Controls the slowdown rate.',
			initialSettings.slowDown,
			{ min: 0.1, max: 100, precision: 5, scaleType: 'log' }
		),
		new Slider<ForceAtlas2Settings>(
			'edgeWeightInfluence',
			'Edge Weight Influence',
			'Influence of the edge weight.',
			initialSettings.edgeWeightInfluence,
			{ min: 0, max: 1, precision: 5, scaleType: 'linear' }
		),
		new Slider<ForceAtlas2Settings>(
			'barnesHutTheta',
			'Barnes Hut Theta',
			'Theta parameter for the Barnes-Hut optimization.',
			initialSettings.barnesHutTheta,
			{ min: 0, max: 2, precision: 5, scaleType: 'linear' }
		)
	];

	let toggles: Toggle<ForceAtlas2Settings>[] = [
		new Toggle<ForceAtlas2Settings>(
			'linLogMode',
			'LinLog Mode',
			initialSettings.linLogMode,
			'Toggles the linear logarithmic mode.'
		),
		new Toggle<ForceAtlas2Settings>(
			'outboundAttractionDistribution',
			'Outbound Attraction Distribution',
			initialSettings.outboundAttractionDistribution,
			'Controls the distribution of outbound attraction.'
		),
		new Toggle<ForceAtlas2Settings>(
			'adjustSizes',
			'Adjust Sizes',
			initialSettings.adjustSizes,
			'Adjusts node sizes to avoid overlap.'
		),
		new Toggle<ForceAtlas2Settings>(
			'strongGravityMode',
			'Strong Gravity Mode',
			initialSettings.strongGravityMode,
			'Enables or disables strong gravity mode.'
		),
		new Toggle<ForceAtlas2Settings>(
			'barnesHutOptimize',
			'Barnes Hut Optimize',
			initialSettings.barnesHutOptimize,
			'Toggles the Barnes-Hut optimization.'
		)
	];

	function updateToggleSettings() {
		const booleanSettings = toggles.reduce(
			(acc, toggle) => {
				acc[toggle.id] = toggle.value;
				return acc;
			},
			{} as Record<string, boolean>
		);
		atlas2PanelSettings.update((settings) => {
			const updatedSettings = { ...settings, ...booleanSettings };
			updateForceSettings(updatedSettings);
			return updatedSettings;
		});
	}

	function updateSliderSettings() {
		const numberSettings = sliders.reduce(
			(acc, slider) => {
				acc[slider.id] = Slider.calculateOriginalValue(slider.value, slider.config);
				return acc;
			},
			{} as Record<string, number>
		);
		atlas2PanelSettings.update((settings) => {
			const updatedSettings = { ...settings, ...numberSettings };
			updateForceSettings(updatedSettings);
			return updatedSettings;
		});
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
					bind:value={slider.value}
					min={slider.config.scaleType === 'log' ? 0 : slider.config.min}
					max={slider.config.scaleType === 'log' ? 100 : slider.config.max}
					step="any"
					class="slider"
					on:input={updateSliderSettings}
				/>
				<div class="slider-min-max">
					<span class="slider-min">{slider.config.min}</span>
					<output for="{slider.id}Slider" class="slider-output">
						{Slider.calculateOriginalValue(slider.value, slider.config)}
					</output>
					<span class="slider-max">{slider.config.max}</span>
				</div>
			</div>
		</div>
	{/each}
	<div class="toggle-container">
		{#each toggles as toggle}
			<div class="toggle-item">
				<div class="toggle-info">
					<span class="toggle-title">{toggle.label}:</span>
					<span class="toggle-description">{toggle.description}</span>
				</div>
				<input
					type="checkbox"
					id="{toggle.id}Toggle"
					class="toggle-input"
					bind:checked={toggle.value}
					on:change={updateToggleSettings}
				/>
				<label for="{toggle.id}Toggle" class="toggle-switch"></label>
			</div>
		{/each}
	</div>
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

	.toggle-container {
		display: flex;
		flex-direction: column;
	}

	.toggle-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.toggle-info {
		flex: 1;
		flex-grow: 1;
	}

	.toggle-title,
	.toggle-description {
		font-size: 1rem; /* Adjust as needed */
	}

	.toggle-input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 49px; /* Adjust width as needed */
		height: 20px; /* Adjust height as needed */
		background-color: #7e7d7d42;
		border-radius: 20px;
		cursor: pointer;
		transition: background-color 0.2s;
		flex-shrink: 0;
	}

	.toggle-switch::before {
		content: '';
		position: absolute;
		left: 2px;
		top: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background-color: white;
		transition: transform 0.2s;
	}

	.toggle-input:checked + .toggle-switch {
		background-color: #007bff77;
	}

	.toggle-input:checked + .toggle-switch::before {
		transform: translateX(28px);
	}

	@media (max-width: 600px) {
		.toggle-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.toggle-switch {
			margin-top: 0.5rem; /* Adds some space between the description and the toggle */
		}
	}
</style>
