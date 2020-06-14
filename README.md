# pwzip

Node Zip Library

* Simple usage
* async / Promises
* low memory usage
* Zip64 support
* Encrypted zip (ZipCrypto and AES)

currently only unzip

## Installation

Will be available using npm later.

## Examples

promises
```js
const Zip = require('pwzip');

const zip = new Zip();

zip.open('archive.zip').then(() => {
  return zip.extract('folder', { password: 'password' });
}).catch(err => {
  console.error(err);
}).finally(() => {
  zip.close();
});
```
es6
```js
const Zip = require('pwzip');

const zip = new Zip();

try {
  await zip.open('archive.zip');
  await zip.extract('folder', { password: 'password' });
} catch(err) {
  console.error(err);
} finally {
  await zip.close();
}
```
