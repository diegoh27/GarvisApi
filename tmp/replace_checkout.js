const fs = require('fs');
const path = 'c:/Users/USER/Desktop/www/GarvisApi/web/src/features/agendar-cita/components/PasoCheckout.tsx';
let code = fs.readFileSync(path, 'utf8');

// The new implementation for the MAIN FORM
const newMainForm = `	/* ─── MAIN FORM ─── */
	return (
		<div>
			{/* Header */}
			<div className="mb-8 lg:mb-10 text-center lg:text-left">
				<h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-brand-900 tracking-tight">
					Checkout y Pago
				</h2>
				<p className="text-brand-600 mt-2 text-sm lg:text-base">
					Paso 4 de 4: Confirma los detalles y procesa tu pago
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				
				{/* LADO IZQUIERDO: FLUJO PRINCIPAL (Paso A, B y C) */}
				<div className="order-2 lg:order-1 lg:col-span-7 flex flex-col gap-6">
					
					{/* PASO A: Selector de Método de Pago */}
					<div className="bg-paper rounded-3xl p-8 shadow-sm border border-brand-200/20">
						<h3 className="text-xl font-bold text-brand-900 mb-6 flex items-center gap-3 font-headline">
							<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-white text-sm">1</span>
							Selecciona tu método de pago
						</h3>
						
						<div className="space-y-1.5 relative mt-4">
							<select
								value={selectedMetodoId}
								onChange={(e) => setSelectedMetodoId(e.target.value)}
								className="w-full bg-cloud border-none rounded-xl py-4 px-5 text-base font-medium focus:ring-2 focus:ring-brand-800/20 appearance-none outline-none cursor-pointer"
							>
								<option value="" disabled>Selecciona un método</option>
								{metodosPago.length === 0 && (
									<option value="">Cargando...</option>
								)}
								{metodosPago.map((m) => (
									<option key={m.id_metodo_pago} value={m.id_metodo_pago}>
										{m.nombre} — {labelTipoPago(m.tipo_pago)} ({m.moneda})
									</option>
								))}
							</select>
							<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-800 rounded-full my-3 ml-2" />
						</div>

						{vistaBs && selectedMetodoId && (
							<div className="mt-4 p-4 rounded-xl bg-cloud border border-brand-200/20">
								<p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tasa del día (BCV)</p>
								<p className="font-bold text-brand-800">{tasaBCV.toFixed(2)} Bs/USD</p>
							</div>
						)}
					</div>

					{/* PASO B: Revelar Datos Bancarios */}
					{selectedMetodo && (
						<div className="bg-paper rounded-3xl p-8 shadow-sm border border-brand-200/20 transition-all duration-500 ease-in-out opacity-100 animate-in fade-in slide-in-from-top-4">
							<h3 className="text-xl font-bold text-brand-900 mb-6 flex items-center gap-3 font-headline">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-white text-sm">2</span>
								Realiza el pago con estos datos
							</h3>

							<div className="flex flex-col xl:flex-row gap-6 items-start">
								{/* QR Code */}
								{displayQrUrl && (
									<div className="w-full xl:w-auto flex justify-center shrink-0">
										<img
											src={displayQrUrl}
											alt="Código QR de pago"
											className="w-40 h-40 rounded-2xl object-contain border border-brand-200/20 bg-white p-2"
										/>
									</div>
								)}

								<div className="w-full space-y-3 flex-1">
									{/* Banco */}
									<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
										<div className="min-w-0 flex-1">
											<p className="text-[10px] text-slate-400 font-bold uppercase">Banco Destino</p>
											<p className="font-bold text-brand-900 text-sm truncate">{displayBanco}</p>
										</div>
									</div>

									{/* Identificación / RIF */}
									{displayIdentificacion !== "—" && (
									<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
										<div className="min-w-0 flex-1">
											<p className="text-[10px] text-slate-400 font-bold uppercase">RIF / Cédula</p>
											<p className="font-bold text-brand-900 text-sm">{displayIdentificacion}</p>
										</div>
										{selectedMetodo?.titular_identificacion && (
											<button
												type="button"
												onClick={() => copyToClipboard(selectedMetodo.titular_identificacion!)}
												className="p-2 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors flex-shrink-0"
											>
												<Copy className="h-4 w-4" />
											</button>
										)}
									</div>
									)}

									{/* Teléfono */}
									{selectedMetodo?.tipo_pago === "PagoMovil" && displayTelefono !== "—" && (
										<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
											<div className="min-w-0 flex-1">
												<p className="text-[10px] text-slate-400 font-bold uppercase">Teléfono</p>
												<p className="font-bold text-brand-900 text-sm">{displayTelefono}</p>
											</div>
											<button
												type="button"
												onClick={() => copyToClipboard(displayTelefono)}
												className="p-2 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors flex-shrink-0"
											>
												<Copy className="h-4 w-4" />
											</button>
										</div>
									)}

									{/* Cuenta */}
									{selectedMetodo?.tipo_pago === "Transferencia" && displayCuenta && (
										<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
											<div className="min-w-0 flex-1">
												<p className="text-[10px] text-slate-400 font-bold uppercase">Nro. Cuenta</p>
												<p className="font-bold text-brand-900 text-sm font-mono tracking-wide">{displayCuenta}</p>
											</div>
											<button
												type="button"
												onClick={() => copyToClipboard(displayCuenta)}
												className="p-2 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors flex-shrink-0"
											>
												<Copy className="h-4 w-4" />
											</button>
										</div>
									)}

									{/* Total highlighting block */}
									<div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200/50 rounded-2xl mt-1">
										<div className="min-w-0 flex-1">
											<p className="text-[10px] text-brand-800 font-bold uppercase mb-1">Monto Exacto a Enviar</p>
											<p className="font-black text-brand-900 text-xl font-headline">
												{vistaBs
													? \`\${montoEnviar.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs\`
													: \`$\${montoEnviar.toFixed(2)}\`}
											</p>
										</div>
									</div>

								</div>
							</div>
						</div>
					)}

					{/* PASO C: Formulario de Reporte */}
					{selectedMetodo && (
						<div className="bg-paper rounded-3xl p-8 lg:p-10 shadow-sm border border-brand-200/20 transition-all duration-500 ease-in-out opacity-100 animate-in fade-in slide-in-from-top-4">
							<h3 className="text-xl font-bold text-brand-900 mb-8 flex items-center gap-3 font-headline">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-white text-sm">3</span>
								Reporta tu pago
							</h3>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{showBanks && (
										<div className="space-y-1.5 relative md:col-span-2">
											<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
												Banco Origen (Desde donde pagas)*
											</label>
											<select
												value={bancoOrigen}
												onChange={(e) => setBancoOrigen(e.target.value)}
												className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20 outline-none"
											>
												<option value="">Seleccionar...</option>
												<option value="Banesco">Banesco</option>
												<option value="Banco de Venezuela">Banco de Venezuela</option>
												<option value="Mercantil">Mercantil</option>
												<option value="Provincial">Provincial</option>
												<option value="BNC">BNC</option>
												<option value="Venezuela">Venezuela</option>
												<option value="Banco del Tesoro">Banco del Tesoro</option>
												<option value="Bicentenario">Bicentenario</option>
												<option value="Otro">Otro</option>
											</select>
											<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
										</div>
									)}

									{showReferencia && (
										<div className="space-y-1.5 relative md:col-span-2">
											<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
												Referencia 
											</label>
											<input
												type="text"
												maxLength={16}
												value={referencia}
												onChange={(e) => setReferencia(e.target.value)}
												placeholder="Ej: 837462947163"
												className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20 outline-none"
											/>
											<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
										</div>
									)}

									<div className="space-y-1.5 relative md:col-span-2">
										<CedulaField
											label="Cédula del pagador*"
											value={cedulaPagador}
											onChange={(tipo, numero) => setCedulaPagador(\`\${tipo}\${numero}\`)}
											required
											inputClassName="bg-cloud border-none rounded-xl"
											selectClassName="bg-cloud border-none rounded-xl"
										/>
										<div className="absolute left-0 top-8 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
									</div>

									<div className="space-y-1.5 relative md:col-span-2">
										<TelefonoField
											label="Teléfono del pagador*"
											value={telefonoPagador}
											onChange={(prefix, number) => setTelefonoPagador(\`\${prefix}\${number}\`)}
											required
											inputClassName="bg-cloud border-none rounded-xl"
											selectClassName="bg-cloud border-none rounded-xl"
										/>
										<div className="absolute left-0 top-8 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
									</div>
								</div>

								{/* Dropzones */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-brand-200/20 mt-6 min-h-[220px]">
									{showComprobante && (
										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">
												Comprobante de pago *
											</label>
											<div
												onClick={() => comprobanteInputRef.current?.click()}
												onDragOver={(e) => { e.preventDefault(); setDragComprobanteActive(true); }}
												onDragLeave={() => setDragComprobanteActive(false)}
												onDrop={handleComprobanteDrop}
												className={\`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group h-full min-h-[200px] \${
													dragComprobanteActive
														? "border-brand-800 bg-brand-100/30"
														: comprobanteFile
															? "border-emerald-500/50 bg-emerald-50/50 text-emerald-800"
															: "border-slate-200 bg-cloud hover:bg-brand-100/20 hover:border-brand-200"
												}\`}
											>
												<input
													ref={comprobanteInputRef}
													type="file"
													accept=".jpg,.jpeg,.png"
													className="hidden"
													onChange={handleComprobanteSelect}
												/>
												<div className={\`w-14 h-14 shrink-0 rounded-full flex items-center justify-center mb-4 transition-colors \${comprobanteFile ? "bg-emerald-100" : "bg-slate-100 group-hover:bg-brand-100"}\`}>
													<Upload className={\`h-6 w-6 \${comprobanteFile ? "text-emerald-700" : "text-slate-400 group-hover:text-brand-600"}\`} />
												</div>
												{comprobanteFile ? (
													<>
														<p className="text-sm font-bold text-center text-emerald-800 line-clamp-1 break-all px-2 max-w-[200px]">{comprobanteFile.name}</p>
														<p className="text-[10px] text-emerald-600/80 mt-1 font-medium select-none">
															{(comprobanteFile.size / 1024).toFixed(1)} KB — clic para cambiar
														</p>
													</>
												) : (
													<>
														<p className="text-sm font-bold text-brand-900 text-center leading-snug select-none">
															Adjunta la captura aquí
														</p>
														<p className="text-[10px] text-slate-400 mt-2 uppercase font-bold text-center tracking-wider select-none">
															JPG o PNG (Max 5MB)
														</p>
													</>
												)}
											</div>
										</div>
									)}

									<div>
										<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">
											Orden Médica (Opcional)
										</label>
										<div
											onClick={() => fileInputRef.current?.click()}
											onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
											onDragLeave={() => setDragActive(false)}
											onDrop={handleFileDrop}
											className={\`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group h-full min-h-[200px] \${dragActive
												? "border-brand-800 bg-brand-100/30"
												: ordenFile
													? "border-brand-800/40 bg-brand-100/40 text-brand-800"
													: "border-slate-200 bg-cloud hover:bg-brand-100/20 hover:border-brand-200"
												}\`}
										>
											<input
												ref={fileInputRef}
												type="file"
												accept=".pdf,.jpg,.jpeg,.png"
												className="hidden"
												onChange={handleFileSelect}
											/>
											<div className={\`w-14 h-14 shrink-0 rounded-full flex items-center justify-center mb-4 transition-colors \${ordenFile ? "bg-brand-100" : "bg-slate-100 group-hover:bg-brand-100"}\`}>
												<Upload className={\`h-6 w-6 \${ordenFile ? "text-brand-800" : "text-slate-400 group-hover:text-brand-600"}\`} />
											</div>
											{ordenFile ? (
												<>
													<p className="text-sm font-bold text-center line-clamp-1 break-all px-2 max-w-[200px] text-brand-900">{ordenFile.name}</p>
													<p className="text-[10px] text-brand-600/80 mt-1 font-medium select-none">
														{(ordenFile.size / 1024).toFixed(1)} KB — clic para cambiar
													</p>
												</>
											) : (
												<>
													<p className="text-sm font-bold text-brand-900 text-center leading-snug select-none">
														Adjunta tu archivo aquí
													</p>
													<p className="text-[10px] text-slate-400 mt-2 uppercase font-bold text-center tracking-wider select-none">
														PDF, JPG o PNG (Max 5MB)
													</p>
												</>
											)}
										</div>
									</div>
								</div>

								{/* Error message */}
								{errorMsg && (
									<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-medium my-4">
										{errorMsg}
									</div>
								)}

								{/* Submit button */}
								<div className="pt-6">
									<button
										type="submit"
										disabled={
											isSubmitting || 
											!selectedMetodo || 
											(showReferencia && !referencia.trim()) || 
											(showComprobante && !comprobanteFile) || 
											!cedulaPagador.trim() || 
											cedulaPagador.length < 3 ||
											!telefonoPagador.trim() || 
											telefonoPagador.length < 13 || 
											(showBanks && !bancoOrigen.trim())
										}
										className="w-full bg-gradient-to-br from-brand-900 to-brand-800 text-white py-4 px-6 rounded-2xl font-extrabold text-lg shadow-xl shadow-brand-800/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed"
									>
										{isSubmitting ? (
											<>
												<Loader2 className="h-5 w-5 animate-spin" />
												Procesando...
											</>
										) : (
											<>
												<CheckCircle2 className="h-5 w-5" />
												Confirmar y Finalizar Cita
											</>
										)}
									</button>
									<p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">
										El pago será verificado por un administrador antes de confirmar tu cita
									</p>
								</div>
							</form>
						</div>
					)}
				</div>

				{/* LADO DERECHO (Resumen de la cita) */}
				<div className="order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-8">
					<div className="bg-paper rounded-3xl p-8 shadow-[0_4px_24px_rgba(5,69,66,0.06)] border border-brand-200/20">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
								Resumen de la Cita
							</h3>
							<div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
								<ScanHeart className="h-5 w-5 text-brand-800" />
							</div>
						</div>
						<p className="text-xl font-bold text-brand-900 font-headline tracking-tight mb-3">
							{ecoNombre}
						</p>
						<div className="flex items-center gap-4 mb-6">
							<div className="flex items-center gap-1.5 text-brand-600">
								<Calendar className="h-4 w-4" />
								<span className="text-xs font-medium">{formatFecha(fecha)}</span>
							</div>
							<div className="flex items-center gap-1.5 text-brand-600">
								<Clock className="h-4 w-4" />
								<span className="text-xs font-medium">{formatHora(hora)}</span>
							</div>
						</div>
						<div className="flex items-center gap-2 mb-6">
							<User className="h-4 w-4 text-brand-600 shrink-0" />
							<span className="text-xs text-brand-600 truncate">
								Dr./Dra. {especialistaNombre}
							</span>
						</div>

						<div className="space-y-3 pt-6 border-t border-brand-200/30">
							<div className="flex justify-between items-center">
								<span className="text-sm text-slate-400">Precio Ecografía</span>
								<span className="text-sm font-semibold text-brand-900">\${precioUSD.toFixed(2)}</span>
							</div>
							{vistaBs && selectedMetodoId && (
								<div className="flex justify-between items-center bg-slate-50 p-2 -mx-2 rounded-lg">
									<span className="text-sm text-slate-400">Tasa BCV</span>
									<span className="text-sm font-semibold text-brand-600">{tasaBCV.toFixed(2)} Bs/USD</span>
								</div>
							)}
							<div className="mt-4 p-5 rounded-2xl bg-cloud border border-brand-200/40 flex items-center justify-between">
								<div>
									<span className="text-[10px] font-bold text-brand-800 uppercase tracking-widest">
										Total a Pagar
									</span>
									<p className="text-[11px] font-medium text-slate-400 mt-0.5">
										{vistaBs ? "Pago en bolívares" : "Pago en dólares"}
									</p>
								</div>
								<span className="text-2xl font-black text-brand-900 font-headline">
									{vistaBs
										? \`\${montoEnviar.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs\`
										: \`$\${montoEnviar.toFixed(2)}\`}
								</span>
							</div>
						</div>
					</div>
					
					{/* Back button under the summary block to ensure mobile doesn't skip it */}
					<div className="flex items-center justify-start mt-6 w-full opacity-70 hover:opacity-100 transition-opacity">
						<button
							type="button"
							onClick={onBack}
							className="flex w-full items-center justify-center gap-2 text-brand-700 font-bold hover:text-brand-900 transition-colors py-3 rounded-xl text-sm border border-transparent hover:border-brand-200 hover:shadow-sm hover:bg-white"
						>
							<ArrowLeft className="h-4 w-4" />
							<span className="font-headline tracking-tight">Volver al paso anterior</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PasoCheckout;
`;

const startIndex = code.indexOf('/* ─── MAIN FORM ─── */');
if (startIndex === -1) {
    console.error("Could not find start index");
    process.exit(1);
}

code = code.substring(0, Math.max(0, startIndex)) + newMainForm;

fs.writeFileSync(path, code);
console.log("Successfully replaced PasoCheckout.tsx main wrapper block");
