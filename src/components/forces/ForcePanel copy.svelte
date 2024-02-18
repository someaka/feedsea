<script lang="ts">
	import { updateForceSettings } from '../graph/graphologySigma';
	import defaultGraphSettings from './defautGraphSettings';

	type Scale = {
		min: number;
		max: number;
	};

	type ScaleType = 'log' | 'linear';

	let gravity = defaultGraphSettings.gravity;
	let repulsion = defaultGraphSettings.repulsion;
	let attraction = defaultGraphSettings.attraction;
	let inertia = defaultGraphSettings.inertia;
	let maxMove = defaultGraphSettings.maxMove;

	const GRAVITY_SLIDER_CONFIG = {
		min: 0,
		max: 100,
		precision: 5,
		scaleType: 'log' as 'log',
		scaleMin: 0.00001,
		scaleMax: 10
	};
	const REPULSION_SLIDER_CONFIG = {
		min: 0,
		max: 100,
		precision: 5,
		scaleType: 'log' as 'log',
		scaleMin: 0.0001,
		scaleMax: 10
	};
	const ATTRACTION_SLIDER_CONFIG = {
		min: 0,
		max: 10000,
		precision: 8,
		scaleType: 'log' as 'log',
		scaleMin: 0.000001,
		scaleMax: 0.01
	};
	const INERTIA_SLIDER_CONFIG = {
		min: 0,
		max: 100,
		precision: 1,
		scaleType: 'linear' as 'linear',
		scaleMin: 0,
		scaleMax: 5
	};
	const MAX_MOVE_SLIDER_CONFIG = {
		min: 0,
		max: 100,
		precision: 0,
		scaleType: 'linear' as 'linear',
		scaleMin: 0,
		scaleMax: 10
	};

	let sliders = [
		{ label: 'Gravity', value: gravity, config: GRAVITY_SLIDER_CONFIG },
		{ label: 'Repulsion', value: repulsion, config: REPULSION_SLIDER_CONFIG },
		{ label: 'Attraction', value: attraction, config: ATTRACTION_SLIDER_CONFIG },
		{ label: 'Inertia', value: inertia, config: INERTIA_SLIDER_CONFIG },
		{ label: 'Max Move', value: maxMove, config: MAX_MOVE_SLIDER_CONFIG }
	];

	function calculateScaledValue(
		value: number,
		scale: Scale,
		precision: number,
		scaleType: ScaleType
	): number {
		let scaledValue: number;
		if (scaleType === 'log') {
			const minLog = Math.log(scale.min);
			const maxLog = Math.log(scale.max);
			const scaleLog = (maxLog - minLog) / (scale.max - scale.min);
			scaledValue = Math.exp(minLog + scaleLog * (value - scale.min));
		} else {
			scaledValue = scale.min + (value / 100) * (scale.max - scale.min);
		}
		return parseFloat(scaledValue.toFixed(precision));
	}

	// Reactive statement to calculate scaled values
	$: scaledSliders = sliders.map((slider) => ({
		...slider,
		scaledValue: calculateScaledValue(
			slider.value,
			{ min: slider.config.scaleMin, max: slider.config.scaleMax },
			slider.config.precision,
			slider.config.scaleType
		)
	}));

	// Update force settings using scaled values
	$: if (scaledSliders.length > 0) {
		updateForceSettings({
			gravity:
				scaledSliders.find((s) => s.label === 'Gravity')?.scaledValue ??
				defaultGraphSettings.gravity,
			repulsion:
				scaledSliders.find((s) => s.label === 'Repulsion')?.scaledValue ??
				defaultGraphSettings.repulsion,
			attraction:
				scaledSliders.find((s) => s.label === 'Attraction')?.scaledValue ??
				defaultGraphSettings.attraction,
			inertia:
				scaledSliders.find((s) => s.label === 'Inertia')?.scaledValue ??
				defaultGraphSettings.inertia,
			maxMove:
				scaledSliders.find((s) => s.label === 'Max Move')?.scaledValue ??
				defaultGraphSettings.maxMove
		});
	}
</script>

<div id="forceSettings">
	<h3>Force Settings</h3>
	{#each sliders as { label, value, config }}
		<div class="slider-container">
			<div class="slider-header">
				<label for="{label.toLowerCase()}Slider" class="slider-title">{label}:</label>
				<small class="slider-explanation">Description for {label}.</small>
			</div>
			<div class="range-slider">
				<input
					type="range"
					id="{label.toLowerCase()}Slider"
					bind:value
					min={config.min}
					max={config.max}
					class="slider"
					data-output="{label.toLowerCase()}Output"
					data-scale-min={config.scaleMin}
					data-scale-max={config.scaleMax}
					data-precision={config.precision}
					data-scale-type={config.scaleType}
				/>
				<div class="slider-min-max">
					<span class="slider-min">{config.min}</span>
					<output id="{label.toLowerCase()}Output" class="slider-output">{value}</output>
					<span class="slider-max">{config.max}</span>
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
		background-color: #c7b5b51c;
		border-radius: 4px; /* Rounded corners for the box */
		width: fit-content; /* Adjust width to content */
		margin-top: 0.5px;
		margin-left: auto; /* Center the box */
		margin-right: auto;
		margin-bottom: 5px;
	}
</style>
