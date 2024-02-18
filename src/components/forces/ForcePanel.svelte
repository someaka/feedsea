<script lang="ts">
	import { onMount } from 'svelte';
	import { updateForceSettings } from '../graph/graphologySigma';
	import defaultGraphSettings from './defautGraphSettings';

	let gravitySlider;
	let repulsionSlider;
	let attractionSlider;
	let inertiaSlider;
	let maxMoveSlider;


	onMount(() => {
		gravitySlider = document.getElementById('gravitySlider');
		repulsionSlider = document.getElementById('repulsionSlider');
		attractionSlider = document.getElementById('attractionSlider');
		inertiaSlider = document.getElementById('inertiaSlider');
		maxMoveSlider = document.getElementById('maxMoveSlider');

		initializeSliders();
	});

	function updateOutput(
		slider: HTMLInputElement,
		output: HTMLElement | null,
		scale: { min: any; max: any; factor?: number },
		precision: number,
		scaleType: string | null
	) {
		const value = parseFloat(slider.value);
		let scaledValue;

		if (scaleType === 'log') {
			const minLog = Math.log(scale.min);
			const maxLog = Math.log(scale.max);
			const sliderMax = parseFloat(slider.getAttribute('max') || '0');
			const sliderMin = parseFloat(slider.getAttribute('min') || '0');
			const scaleLog = (maxLog - minLog) / (sliderMax - sliderMin);
			scaledValue = Math.exp(minLog + scaleLog * (value - sliderMin));
		} else {
			scaledValue = scale.min + (value / 100) * (scale.max - scale.min);
		}

		if (output) {
			output.textContent = scaledValue.toFixed(precision);
		}
	}

	function initializeSliders() {
		const sliders = document.querySelectorAll('.slider');

		sliders.forEach((slider) => {
			const outputId = slider.getAttribute('data-output') as string;
			const output = document.getElementById(outputId);
			const scale = {
				min: parseFloat(slider.getAttribute('data-scale-min') || '0'),
				max: parseFloat(slider.getAttribute('data-scale-max') || '0'),
				factor: parseFloat(slider.getAttribute('data-scale-factor') || '1')
			};
			const precision = parseInt(slider.getAttribute('data-precision') || '2', 10);
			const scaleType = slider.getAttribute('data-scale-type');

			let defaultPosition;
			if (scaleType === 'log') {
				const minLog = Math.log(scale.min);
				const maxLog = Math.log(scale.max);
				const sliderMax = parseFloat(slider.getAttribute('max') || '0');
				const sliderMin = parseFloat(slider.getAttribute('min') || '0');
				const scaleLog = (maxLog - minLog) / (sliderMax - sliderMin);
				const defaultValue = parseFloat(output?.textContent || '0');
				defaultPosition =
					(Math.log(defaultValue) - minLog) / scaleLog +
					parseFloat((slider as HTMLInputElement).min);
			} else {
				const defaultValue = parseFloat(output?.textContent || '0');
				defaultPosition = ((defaultValue - scale.min) / (scale.max - scale.min)) * 100;
			}
			(slider as HTMLInputElement).value = defaultPosition.toString();

			slider.addEventListener('input', () => {
				updateOutput(slider as HTMLInputElement, output, scale, precision, scaleType);
				updateForceSettings({
					gravity: parseFloat(document.getElementById('gravityOutput')?.textContent || '0'),
					repulsion: parseFloat(document.getElementById('repulsionOutput')?.textContent 	|| '0'),
					attraction: parseFloat(document.getElementById('attractionOutput')?.textContent || '0'),
					inertia: parseFloat(document.getElementById('inertiaOutput')?.textContent || '0'),
					maxMove: parseFloat(document.getElementById('maxMoveOutput')?.textContent || '0')
				});
			});

			updateOutput(slider as HTMLInputElement, output, scale, precision, scaleType);
		});
	}


</script>

<div id="forceSettings">
	<h3>Force Settings</h3>
	<!-- Gravity Slider -->
	<div class="slider-container">
		<div class="slider-header">
			<label for="gravitySlider" class="slider-title">Gravity:</label>
			<small class="slider-explanation"
				>Higher gravity pulls nodes closer to center, lower lets them drift apart.</small
			>
		</div>
		<div class="range-slider">
			<input
				type="range"
				id="gravitySlider"
				min="0"
				max="100"
				value="1"
				class="slider"
				data-output="gravityOutput"
				data-scale-min="0.00001"
				data-scale-max="10"
				data-scale-factor="1"
				data-precision="5"
				data-scale-type="log"
			/>
			<div class="slider-min-max">
				<span class="slider-min">0.00001</span>
				<output id="gravityOutput" class="slider-output">{defaultGraphSettings.gravity}</output>
				<span class="slider-max">10</span>
			</div>
		</div>
	</div>

	<!-- Repulsion Slider -->
	<div class="slider-container">
		<div class="slider-header">
			<label for="repulsionSlider" class="slider-title">Repulsion:</label>
			<small class="slider-explanation"
				>Higher repulsion spreads nodes further apart, lower brings them closer.</small
			>
		</div>
		<div class="range-slider">
			<input
				type="range"
				id="repulsionSlider"
				min="0"
				max="100"
				value="70"
				class="slider"
				data-output="repulsionOutput"
				data-scale-min="0.0001"
				data-scale-max="10"
				data-scale-factor="1"
				data-precision="5"
				data-scale-type="log"
			/>
			<div class="slider-min-max">
				<span class="slider-min">0.0001</span>
				<output id="repulsionOutput" class="slider-output">{defaultGraphSettings.repulsion}</output>
				<span class="slider-max">10</span>
			</div>
		</div>
	</div>

	<!-- Attraction Slider -->
	<div class="slider-container">
		<div class="slider-header">
			<label for="attractionSlider" class="slider-title">Attraction:</label>
			<small class="slider-explanation"
				>Higher attraction increases the force pulling connected nodes together.</small
			>
		</div>
		<div class="range-slider">
			<input
				type="range"
				id="attractionSlider"
				min="0"
				max="10000"
				value="10"
				class="slider"
				data-output="attractionOutput"
				data-scale-min="0.000001"
				data-scale-max="0.01"
				data-scale-factor="0.0001"
				data-precision="8"
				data-scale-type="log"
			/>
			<div class="slider-min-max">
				<span class="slider-min">0.000001</span>
				<output id="attractionOutput" class="slider-output">{defaultGraphSettings.attraction}</output>
				<span class="slider-max">0.01</span>
			</div>
		</div>
	</div>

	<!-- Inertia Slider -->
	<div class="slider-container">
		<div class="slider-header">
			<label for="inertiaSlider" class="slider-title">Inertia:</label>
			<small class="slider-explanation"
				>Higher inertia maintains node velocity, lower inertia slows nodes down faster.</small
			>
		</div>
		<div class="range-slider">
			<input
				type="range"
				id="inertiaSlider"
				min="0"
				max="100"
				value="60"
				class="slider"
				data-output="inertiaOutput"
				data-scale-min="0"
				data-scale-max="5"
				data-scale-factor="1"
				data-precision="1"
				data-scale-type="linear"
				step="0.1"
			/>
			<div class="slider-min-max">
				<span class="slider-min">0</span>
				<output id="inertiaOutput" class="slider-output">{defaultGraphSettings.inertia}</output>
				<span class="slider-max">5</span>
			</div>
		</div>
	</div>

	<!-- Max Move Slider -->
	<div class="slider-container">
		<div class="slider-header">
			<label for="maxMoveSlider" class="slider-title">Max Move:</label>
			<small class="slider-explanation"
				>Higher max move allows nodes to move further in each iteration.</small
			>
		</div>
		<div class="range-slider">
			<input
				type="range"
				id="maxMoveSlider"
				min="0"
				max="100"
				value="1"
				class="slider"
				data-output="maxMoveOutput"
				data-scale-min="0"
				data-scale-max="10"
				data-scale-factor="1"
				data-precision="0"
				data-scale-type="linear"
			/>
			<div class="slider-min-max">
				<span class="slider-min">0</span>
				<output id="maxMoveOutput" class="slider-output">{defaultGraphSettings.maxMove}</output>
				<span class="slider-max">10</span>
			</div>
		</div>
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
