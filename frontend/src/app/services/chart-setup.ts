/**
 * Tree-shaken Chart.js setup.
 * Only registers the components actually used by the calculators,
 * avoiding the full `registerables` bundle (~60 KB savings).
 */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

let registered = false;

export function registerChartComponents(): typeof Chart {
  if (!registered) {
    Chart.register(
      BarController,
      BarElement,
      LineController,
      LineElement,
      PointElement,
      CategoryScale,
      LinearScale,
      Tooltip,
      Legend,
      Filler
    );
    registered = true;
  }
  return Chart;
}
