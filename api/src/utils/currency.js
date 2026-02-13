const axios = require("axios");

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const isBsPaymentMethod = (metodo = "") => {
	const normalized = String(metodo || "").trim().toLowerCase();
	return normalized === "transferencia" || normalized === "pagomovil";
};

const normalizeCitaAmounts = ({ montoInput, metodo, tasaBcv }) => {
	const amount = Number(montoInput || 0);
	const rate = Number(tasaBcv || 0);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error("Monto inválido");
	}
	if (!Number.isFinite(rate) || rate <= 0) {
		throw new Error("Tasa BCV inválida");
	}

	if (isBsPaymentMethod(metodo)) {
		const montoBs = round2(amount);
		const montoUsd = round2(montoBs / rate);
		return {
			monto_usd: montoUsd,
			monto_bs: montoBs,
			tasa_dia_bcv: rate,
			monto_total_dol: montoUsd,
			monto_total_bs: montoBs,
			tasa_dia: rate,
		};
	}

	const montoUsd = round2(amount);
	const montoBs = round2(montoUsd * rate);
	return {
		monto_usd: montoUsd,
		monto_bs: montoBs,
		tasa_dia_bcv: rate,
		monto_total_dol: montoUsd,
		monto_total_bs: montoBs,
		tasa_dia: rate,
	};
};

const normalizeUsdAmounts = ({ montoUsd, tasaBcv }) => {
	const usd = Number(montoUsd || 0);
	const rate = Number(tasaBcv || 0);
	if (!Number.isFinite(usd) || usd <= 0) {
		throw new Error("Monto USD inválido");
	}
	if (!Number.isFinite(rate) || rate <= 0) {
		throw new Error("Tasa BCV inválida");
	}
	return {
		monto_usd: round2(usd),
		monto_bs: round2(usd * rate),
		tasa_dia_bcv: rate,
		monto_total_dol: round2(usd),
		monto_total_bs: round2(usd * rate),
		tasa_dia: rate,
	};
};

const getTodayBcvRate = async () => {
	const forcedRate = Number(
		process.env.FORCE_BCV_RATE || process.env.TEST_BCV_RATE || 0,
	);
	if (Number.isFinite(forcedRate) && forcedRate > 0) {
		return forcedRate;
	}

	const response = await axios.get("https://ve.dolarapi.com/v1/dolares/oficial", {
		timeout: 5000,
	});
	const rate = Number(response?.data?.promedio);
	if (!Number.isFinite(rate) || rate <= 0) {
		throw new Error("No se pudo obtener tasa BCV válida");
	}
	return rate;
};

module.exports = {
	round2,
	isBsPaymentMethod,
	normalizeCitaAmounts,
	normalizeUsdAmounts,
	getTodayBcvRate,
};
