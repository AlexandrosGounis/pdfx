# Third-Party Notices

PDFx bundles the third-party open-source components listed below. Each is
distributed under its own license. This file is provided for attribution and
does **not** alter the license of PDFx itself (see `LICENSE`).

Full license text for each component ships inside its package directory at
`node_modules/<name>/LICENSE` (or `LICENSE.md`).

## Bundled runtime components

| Component                 | Version | License    |
| ------------------------- | ------- | ---------- |
| electron                  | 38.4.0  | MIT        |
| react                     | 19.2.7  | MIT        |
| react-dom                 | 19.2.7  | MIT        |
| pdf-lib                   | 1.17.1  | MIT        |
| pdfjs-dist                | 5.7.284 | Apache-2.0 |
| tesseract.js              | 7.0.0   | Apache-2.0 |
| tesseract.js-core         | 7.0.0   | Apache-2.0 |
| signature_pad             | 5.1.3   | MIT        |
| fflate                    | 0.8.3   | MIT        |
| d3-selection              | 3.0.0   | ISC        |
| d3-zoom                   | 3.0.0   | ISC        |
| @electron-toolkit/preload | 3.0.2   | MIT        |
| @electron-toolkit/utils   | 4.0.0   | MIT        |
| @tesseract.js-data/eng    | 1.0.0   | MIT        |
| @tesseract.js-data/deu    | 1.0.0   | MIT        |
| @tesseract.js-data/fra    | 1.0.0   | MIT        |
| @tesseract.js-data/spa    | 1.0.0   | MIT        |

### OCR language data

The `@tesseract.js-data/*` packages carry the trained OCR models used by the
optional text-recognition feature. The npm packages are published under MIT;
the underlying trained data originates from the Tesseract OCR project
(<https://github.com/tesseract-ocr/tessdata>), distributed under Apache-2.0.

## License references

- MIT — <https://opensource.org/license/mit>
- Apache-2.0 — <https://www.apache.org/licenses/LICENSE-2.0>
- ISC — <https://opensource.org/license/isc-license-txt>

## Signing feature

The appearance-based signing feature reuses patterns and small amounts of code
from the MIT-licensed `signature_pad` and `pdf-lib` projects (both listed
above). No cryptographic signing is performed.
