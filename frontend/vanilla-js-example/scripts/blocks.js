import { fetchBlockDetails, fetchLatestBlocks } from "./shared/arkivClient.js";
import {
	formatAddress,
	formatDateTime,
	formatNumber,
} from "./shared/formatters.js";

const REFRESH_INTERVAL_MS = 60_000;
const RETRY_INTERVAL_ON_ERROR_MS = 20_000;

const statusFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
});

const statusElement = document.querySelector("[data-status]");
const lastUpdatedElement = document.querySelector("[data-last-updated]");
const tableBody = document.querySelector("[data-blocks]");
const refreshButton = document.getElementById("refresh-button");
const tableSection = document.querySelector(".table-section");

if (
	!statusElement ||
	!lastUpdatedElement ||
	!tableBody ||
	!refreshButton ||
	!tableSection
) {
	throw new Error("Required elements for latest blocks are missing");
}

let refreshTimeoutId = null;
let isFetchingBlocks = false;

function scheduleNextRefresh(delay) {
	if (refreshTimeoutId !== null) {
		window.clearTimeout(refreshTimeoutId);
	}

	refreshTimeoutId = window.setTimeout(() => {
		void loadLatestBlocks({ showLoadingStatus: false });
	}, delay);
}

function setStatus(message, variant = "info") {
	statusElement.textContent = message;
	statusElement.dataset.variant = variant;
}

function setLastUpdated(timestamp) {
	if (timestamp instanceof Date && Number.isFinite(timestamp.getTime())) {
		lastUpdatedElement.textContent = `Updated ${statusFormatter.format(timestamp)}`;
	} else {
		lastUpdatedElement.textContent = "";
	}
}

function setBusy(isBusy) {
	tableSection.setAttribute("aria-busy", String(isBusy));
	refreshButton.disabled = isBusy;
}

function createExternalLink(href, label) {
	const anchor = document.createElement("a");
	anchor.href = href;
	anchor.textContent = label;
	anchor.className = "entity-link";
	anchor.target = "_blank";
	anchor.rel = "noreferrer";
	return anchor;
}

function updateTableRows(blocks) {
	tableBody.innerHTML = "";
	const fragment = document.createDocumentFragment();

	for (const block of blocks) {
		const row = document.createElement("tr");

		const numberCell = document.createElement("td");
		const numberLink = document.createElement("a");
		numberLink.href = `blocks.html?block=${encodeURIComponent(block.blockNumber)}`;
		numberLink.className = "table-link";
		numberLink.textContent = `#${block.blockNumber}`;
		numberCell.appendChild(numberLink);
		row.appendChild(numberCell);

		const timestampCell = document.createElement("td");
		timestampCell.textContent = formatDateTime(block.timestamp);
		row.appendChild(timestampCell);

		const minerCell = document.createElement("td");
		const minerLink = createExternalLink(
			`https://etherscan.io/address/${block.miner}`,
			formatAddress(block.miner),
		);
		minerLink.title = block.miner;
		minerCell.appendChild(minerLink);
		row.appendChild(minerCell);

		const transactionsCell = document.createElement("td");
		transactionsCell.className = "cell-numeric";
		transactionsCell.textContent = block.transactionCount.toLocaleString();
		row.appendChild(transactionsCell);

		const entityCell = document.createElement("td");
		const entityLink = createExternalLink(
			`https://explorer.mendoza.hoodi.arkiv.network/entity/${block.arkivEntityKey}?tab=data`,
			formatAddress(block.arkivEntityKey),
		);
		entityLink.title = block.arkivEntityKey;
		entityCell.appendChild(entityLink);
		row.appendChild(entityCell);

		fragment.appendChild(row);
	}

	tableBody.appendChild(fragment);
}

async function loadLatestBlocks(
	{ showLoadingStatus } = { showLoadingStatus: true },
) {
	if (isFetchingBlocks) {
		return;
	}

	isFetchingBlocks = true;
	setBusy(true);

	if (showLoadingStatus) {
		setStatus("Fetching latest blocks...", "info");
	}

	try {
		const blocks = await fetchLatestBlocks();
		if (!blocks.length) {
			throw new Error("No block data returned from Arkiv");
		}

		updateTableRows(blocks);

		const latestBlock = blocks[0];
		if (latestBlock) {
			setStatus(`Latest block #${latestBlock.blockNumber} loaded.`, "success");
			setLastUpdated(new Date());
		} else {
			setStatus("Latest block information unavailable.", "info");
			setLastUpdated(null);
		}

		scheduleNextRefresh(REFRESH_INTERVAL_MS);
	} catch (error) {
		console.error("Failed to fetch latest blocks", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		setStatus(`Could not refresh blocks: ${message}`, "error");
		setLastUpdated(null);
		scheduleNextRefresh(RETRY_INTERVAL_ON_ERROR_MS);
	} finally {
		isFetchingBlocks = false;
		setBusy(false);
	}
}

refreshButton.addEventListener("click", () => {
	void loadLatestBlocks({ showLoadingStatus: true });
});

void loadLatestBlocks({ showLoadingStatus: true });

// Block lookup logic
const blockForm = document.getElementById("block-form");
const blockInput = document.getElementById("block-number");
const blockSubmitButton = document.getElementById("fetch-block");
const blockStatusElement = document.querySelector("[data-block-status]");
const blockLastUpdatedElement = document.querySelector(
	"[data-block-last-updated]",
);
const blockDetailsContainer = document.querySelector("[data-block-details]");

if (
	!blockForm ||
	!blockInput ||
	!blockSubmitButton ||
	!blockStatusElement ||
	!blockDetailsContainer
) {
	throw new Error("Required elements for block lookup are missing");
}

const blockFieldMap = {
	"block-number": blockDetailsContainer.querySelector(
		'[data-field="block-number"]',
	),
	timestamp: blockDetailsContainer.querySelector('[data-field="timestamp"]'),
	"block-hash": blockDetailsContainer.querySelector(
		'[data-field="block-hash"]',
	),
	"parent-hash": blockDetailsContainer.querySelector(
		'[data-field="parent-hash"]',
	),
	miner: blockDetailsContainer.querySelector('[data-field="miner"]'),
	"transaction-count": blockDetailsContainer.querySelector(
		'[data-field="transaction-count"]',
	),
	"gas-used": blockDetailsContainer.querySelector('[data-field="gas-used"]'),
	"gas-limit": blockDetailsContainer.querySelector('[data-field="gas-limit"]'),
	"gas-price": blockDetailsContainer.querySelector('[data-field="gas-price"]'),
	"base-fee": blockDetailsContainer.querySelector('[data-field="base-fee"]'),
	size: blockDetailsContainer.querySelector('[data-field="size"]'),
	"arkiv-entity": blockDetailsContainer.querySelector(
		'[data-field="arkiv-entity"]',
	),
};

function updateBlockStatus(message, variant = "info") {
	blockStatusElement.textContent = message;
	blockStatusElement.dataset.variant = variant;
}

function setBlockLastUpdated(timestamp) {
	if (!blockLastUpdatedElement) {
		return;
	}

	if (timestamp instanceof Date && Number.isFinite(timestamp.getTime())) {
		blockLastUpdatedElement.textContent = statusFormatter.format(timestamp);
	} else {
		blockLastUpdatedElement.textContent = "";
	}
}

function renderBlockDetails(data) {
	blockDetailsContainer.hidden = false;
	blockFieldMap["block-number"].textContent = data.blockNumber;
	blockFieldMap.timestamp.textContent = formatDateTime(data.timestamp);
	blockFieldMap["block-hash"].textContent = data.blockHash || "—";
	blockFieldMap["parent-hash"].textContent = data.parentHash || "—";
	blockFieldMap.miner.textContent = data.miner || "—";
	blockFieldMap["transaction-count"].textContent = formatNumber(
		Number(data.transactionCount) || 0,
	);
	blockFieldMap["gas-used"].textContent = data.gasUsed || "—";
	blockFieldMap["gas-limit"].textContent = data.gasLimit || "—";
	blockFieldMap["gas-price"].textContent = data.gasPrice || "—";
	blockFieldMap["base-fee"].textContent = data.baseFeePerGas || "—";
	blockFieldMap.size.textContent = data.size || "—";
	blockFieldMap["arkiv-entity"].textContent = data.arkivEntityKey || "—";
}

let isFetchingBlockDetails = false;

async function lookupBlock(blockNumber) {
	if (!blockNumber) {
		updateBlockStatus("Provide a block number to fetch details.", "info");
		return;
	}

	if (isFetchingBlockDetails) {
		return;
	}

	isFetchingBlockDetails = true;
	blockSubmitButton.disabled = true;
	blockInput.disabled = true;
	updateBlockStatus(`Looking up block #${blockNumber}...`, "info");
	blockDetailsContainer.hidden = true;

	try {
		const details = await fetchBlockDetails(blockNumber);
		renderBlockDetails(details);
		updateBlockStatus(`Block #${blockNumber} fetched successfully.`, "success");
		setBlockLastUpdated(new Date());
	} catch (error) {
		console.error("Failed to fetch block details", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		updateBlockStatus(message, "error");
		setBlockLastUpdated(null);
	} finally {
		isFetchingBlockDetails = false;
		blockSubmitButton.disabled = false;
		blockInput.disabled = false;
	}
}

blockForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const value = blockInput.value.trim();
	if (!value) {
		updateBlockStatus("Enter a valid block number to continue.", "error");
		return;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		updateBlockStatus("Block numbers must be non-negative integers.", "error");
		return;
	}
	void lookupBlock(String(parsed));
});

const params = new URLSearchParams(window.location.search);
const blockQuery = params.get("block");
if (blockQuery) {
	blockInput.value = blockQuery;
	void lookupBlock(blockQuery);
}
