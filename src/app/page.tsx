'use client';

import Spotlight from '@/components/better-spotlight';
import MiniVoiceAssistant from '@/components/mini-assistant';

export default function Page() {
	return (
		<div className="flex items-center justify-center w-5xl h-screen bg-transparent overflow-none">
			<Spotlight />
			<MiniVoiceAssistant/>
		</div>
	);
}