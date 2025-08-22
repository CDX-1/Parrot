'use client';

import { prompt } from "@/lib/llama";

export default function Home() {
	const b = () => {
		const c = async () => {
			console.log("Prompting");
			console.log("=====================");
			const res = await prompt('gemma3:1b', "What are some fruits that are mistaken for vegetables?");
			console.log(res);
			console.log("=====================");
		}

        c();
	}

	return (
		<div>
			<button onClick={b} className="bg-red-500 px-2 py-1 hover:bg-red-700">Test</button>
		</div>
	);
}
