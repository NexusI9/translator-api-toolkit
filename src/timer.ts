export class Timer {

	startTime: number = 0;

	start() {
		this.startTime = Date.now();
	}


	end() {
		if (!this.startTime) throw new Error("Timer not started");
		const elapsedMs = Date.now() - this.startTime;
		return elapsedMs; // elapsed time in milliseconds
	}

}
