export type GlmTransferDailyPoint = {
	date: string;
	transferCount: number;
	transferVolume: number;
	arkivEntityKey: string;
};

export type GlmTransferHourlyPoint = {
	timestamp: number;
	transferCount: number;
	transferVolume: number;
	arkivEntityKey: string;
};
