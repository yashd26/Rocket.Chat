import './migrations';
import './appcache';
import './callbacks';
import './cron';
import './initialData';
import './serverRunning';
import './coreApps';
import './presenceTroubleshoot';
import '../hooks';
import '../lib/rooms/roomTypes';
import '../lib/settingsRegenerator';
import { isRunningMs } from '../lib/isRunningMs';

if (!isRunningMs()) {
	require('./watchDb');
}
