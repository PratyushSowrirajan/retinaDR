# Sample data

Two retinal fundus photographs for trying the app and for the automated model test.

| File | What it is | Expected model output |
|---|---|---|
| `YESDR.jpg` | Fundus image with visible retinopathy signs | **Diabetic Retinopathy detected** (confidence about 100%) |
| `NODR.png` | Healthy-looking fundus image | **No Diabetic Retinopathy detected** (confidence about 100%) |

The expected outputs are recorded in [`expected-results.json`](expected-results.json). They are what the live
Hugging Face model returned when this repository was prepared.

## How to use

**In the web app:** start the app (see the main README), pick a patient, drag one of these images into the
upload box and press **Run analysis**.

**From the command line** (checks the live model against the expected results):

```bash
cd server
npm run test:model
```

The 6 patients used for demos are seeded into PostgreSQL by `npm run db:init`
(see `server/scripts/seed-data.js`). They are fictional.

## Using your own images

Any JPG or PNG fundus photograph works. The model resizes it to 224 x 224 and applies ImageNet normalisation,
so no manual preprocessing is needed.
