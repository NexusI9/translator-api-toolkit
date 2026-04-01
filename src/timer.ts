
/**
|--------------------------------------------------
| Timer
|
| Responsible for computing elapsed time between
| functions. 
|
|--------------------------------------------------
 */
export class Timer {

	startTime: number = 0;

	/**
	 * Defines timer instance starting time 
	 */
	start() {
		this.startTime = Date.now();
	}

	/**
	 * Compute elapsed time 
	 */
	end() {
		if (!this.startTime) throw new Error("Timer not started");
		const elapsedMs = Date.now() - this.startTime;
		return elapsedMs; // elapsed time in milliseconds
	}

}
