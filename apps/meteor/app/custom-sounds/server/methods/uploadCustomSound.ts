import { Meteor } from 'meteor/meteor';

import { hasPermission } from '../../../authorization/server';
import { api } from '../../../../server/sdk/api';
import { RocketChatFile } from '../../../file/server';
import { RocketChatFileCustomSoundsInstance } from '../startup/custom-sounds';
import { methodDeprecationLogger } from '../../../lib/server/lib/deprecationWarningLogger';

Meteor.methods({
	uploadCustomSound(binaryContent, contentType, soundData) {
		methodDeprecationLogger.warn('uploadCustomSound will be deprecated in future versions of Rocket.Chat');

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (!hasPermission(this.userId!, 'manage-sounds')) {
			throw new Meteor.Error('not_authorized');
		}

		const file = Buffer.from(binaryContent, 'binary');

		const rs = RocketChatFile.bufferToStream(file);
		RocketChatFileCustomSoundsInstance.deleteFile(`${soundData._id}.${soundData.extension}`);
		const ws = RocketChatFileCustomSoundsInstance.createWriteStream(`${soundData._id}.${soundData.extension}`, contentType);
		ws.on(
			'end',
			setTimeout(() => api.broadcast('notify.updateCustomSound', { soundData }), 500),
		);

		rs.pipe(ws);
	},
});
