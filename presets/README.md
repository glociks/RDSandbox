# Presets Directory (`/presets/`)

This directory houses built-in and default presets for **RDSandBox**.

## Adding a New Built-in Preset

1. **Export a Preset from the App**:
   - In the top bar, click **File** $\rightarrow$ **Export Current Preset...** or click **Presets** $\rightarrow$ **Save**.
   - Download the `.json` preset file.

2. **Add to this folder**:
   - Save the file as a TypeScript module (e.g. `presets/default/myCustomPreset.ts`) or copy the JSON structure.
   - Example format:
   ```ts
   import { PresetData } from '../../types';
   import { DEFAULT_PARAMS } from '../../constants';

   export const myCustomPreset: PresetData = {
     name: "My Custom Preset",
     desc: "Description of the simulation mode.",
     params: {
       ...DEFAULT_PARAMS,
       totalDensity: 6.0,
       colorMap: "electric"
     },
     effects: [
       // active effect stack
     ],
     continuousSeeds: [
       // active seeds
     ]
   };
   ```

3. **Register in `presets/index.ts`**:
   - Import your preset in `presets/index.ts` and add it to the `REGIME_PRESETS` array.
   - The preset will immediately be available under **Default Presets** in the Presets menu on the site!
