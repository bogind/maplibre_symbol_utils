import os from 'os';
import { exec } from 'child_process';

if (os.platform() === 'win32') {
  exec('npm run postbuild:win');
} else {
  exec('npm run postbuild:unix');
}