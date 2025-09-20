"use client";
import React, { useState } from "react";
import { registerLcaOpen2025 } from "../server-actions";

export default function TournamentRegistrationForm() {
	// Form state
	const [form, setForm] = useState({
		surname: "",
		names: "",
		phone: "",
		dob: "",
		chessaId: "",
		rating: "",
		section: "",
		emergencyName: "",
		emergencyPhone: "",
		comments: "",
	});
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState<null | any>(null);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	// Handlers
	function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
		const { name, value } = e.target;
		setForm(f => ({ ...f, [name]: value }));
	}

	function handleSectionSelect(section: string) {
		setForm(f => ({ ...f, section }));
	}

	type FormFields = {
		surname: string;
		names: string;
		phone: string;
		dob: string;
		chessaId: string;
		rating: string;
		section: string;
		emergencyName: string;
		emergencyPhone: string;
		comments: string;
	};
	function validate(form: FormFields) {
		const errors: Record<string, string> = {};
		if (!form.surname.trim()) errors.surname = "Surname is required.";
		if (!form.names.trim()) errors.names = "Name(s) is required.";
		if (!form.phone.trim()) errors.phone = "Phone number is required.";
		else if (!/^\d{8,}$/.test(form.phone.replace(/[^\d]/g, ""))) errors.phone = "Enter a valid phone number.";
		if (!form.dob) errors.dob = "Date of birth is required.";
		if (!form.section) errors.section = "Please select a section.";
		if (!form.emergencyName.trim()) errors.emergencyName = "Emergency contact name is required.";
		if (!form.emergencyPhone.trim()) errors.emergencyPhone = "Emergency contact phone is required.";
		else if (!/^\d{8,}$/.test(form.emergencyPhone.replace(/[^\d]/g, ""))) errors.emergencyPhone = "Enter a valid phone number.";
		return errors;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setFieldErrors({});
		const errors = validate(form);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}
		setSubmitting(true);
		const result = await registerLcaOpen2025({
			surname: form.surname,
			names: form.names,
			phone: form.phone,
			dob: form.dob,
			chessaId: form.chessaId,
			rating: form.rating,
			section: form.section,
			emergencyName: form.emergencyName,
			emergencyPhone: form.emergencyPhone,
			comments: form.comments,
		});
		setSubmitting(false);
		if (result?.error) {
			setError(result.error);
			return;
		}
		setSuccess(result.player);
		setForm({
			surname: "",
			names: "",
			phone: "",
			dob: "",
			chessaId: "",
			rating: "",
			section: "",
			emergencyName: "",
			emergencyPhone: "",
			comments: "",
		});
	}

	if (success) {
		return (
			<div className="max-w-xl mx-auto bg-green-50 border border-green-200 rounded-lg p-8 mt-8 text-center">
				<h2 className="text-2xl font-extrabold mb-2 text-green-800">Registration Successful!</h2>
				<p className="mb-4 text-green-900 text-lg">Thank you for registering for the Limpopo Chess Academy Open 2025.</p>
				<div className="text-left bg-white border border-green-200 rounded-lg p-4 mb-4 shadow-sm">
					<div className="mb-2 text-base font-bold text-green-800">Player Details</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm md:text-base">
						<div><span className="font-semibold">Surname:</span> {success.surname}</div>
						<div><span className="font-semibold">Name(s):</span> {success.names}</div>
						<div><span className="font-semibold">Section:</span> {success.section}</div>
						<div><span className="font-semibold">Phone:</span> {success.phone}</div>
						<div><span className="font-semibold">Date of Birth:</span> {success.dob}</div>
						<div><span className="font-semibold">Chessa ID:</span> {success.chessa_id || '-'}</div>
						<div><span className="font-semibold">Rating:</span> {success.rating || '-'}</div>
						<div><span className="font-semibold">Emergency Contact:</span> {success.emergency_name} ({success.emergency_phone})</div>
						<div className="col-span-2"><span className="font-semibold">Comments:</span> {success.comments || '-'}</div>
					</div>
				</div>
				<div className="text-green-700 text-base font-medium mb-2">Player lists will be posted on chess-results.com when organizers make them available.</div>
			</div>
		);
	}

	return (
		<form className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-4 md:p-8 space-y-8 mt-8 transition-colors" onSubmit={handleSubmit}>
			{/* 1. Header Section */}
			<div className="flex flex-col items-center gap-2 mb-2">
				{/* Poster placeholder */}
				<div className="w-full h-40 md:h-56 bg-gray-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
					<span className="text-gray-400 dark:text-zinc-500 text-lg">[Tournament Poster]</span>
				</div>
				<h1 className="text-2xl md:text-4xl font-extrabold text-center mb-1 text-zinc-900 dark:text-zinc-100">Limpopo Chess Academy Open 2025</h1>
				<span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-3 py-1 rounded-full">Sponsored by [Sponsor Name]</span>
			</div>
			{/* 3. Fee Structure as Section Selector */}
			<div className="flex flex-col md:flex-row gap-4 mb-2">
				{[
					{ key: "A", label: "A Section", price: "R300", desc: "Open to all players" },
					{ key: "B", label: "B Section", price: "R250", desc: "Rated 1430 & lower, adults, juniors >14yrs" },
					{ key: "Junior", label: "Junior Section", price: "R150", desc: "Juniors 14yrs & younger" },
				].map(card => (
									<button
										type="button"
										key={card.key}
										onClick={() => handleSectionSelect(card.key)}
										className={`flex-1 rounded-lg border-2 p-4 text-center transition-all duration-150 focus:outline-none focus:ring-2
										  ${form.section === card.key ? "border-blue-700 bg-blue-50 dark:bg-blue-900 dark:border-blue-400" : "border-gray-200 dark:border-zinc-700 bg-yellow-50 dark:bg-zinc-800 hover:border-blue-400 dark:hover:border-blue-400"}
										  ${fieldErrors.section && !form.section ? "border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500" : ""}`}
										aria-pressed={form.section === card.key}
									>
						<div className="font-bold text-lg mb-1">{card.label}</div>
						<div className="text-2xl font-extrabold text-yellow-700 mb-1">{card.price}</div>
						<div className="text-xs text-yellow-800">{card.desc}</div>
					</button>
				))}
			</div>
					{fieldErrors.section && !form.section && <div className="text-rose-600 dark:text-rose-400 text-sm mb-2 font-semibold">{fieldErrors.section}</div>}
			{/* 4. Registration Form Fields */}
					<div className="space-y-4">
							<div className="grid md:grid-cols-2 gap-4">
					<div>
						<label className="block font-semibold mb-1">Surname *</label>
										<input name="surname" required value={form.surname} onChange={handleChange} className={`input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${fieldErrors.surname ? 'border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500' : ''}`} placeholder="e.g. Mabitsela" />
						{fieldErrors.surname && <div className="text-red-600 text-xs mt-1">{fieldErrors.surname}</div>}
					</div>
					<div>
						<label className="block font-semibold mb-1">Name(s) *</label>
										<input name="names" required value={form.names} onChange={handleChange} className={`input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${fieldErrors.names ? 'border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500' : ''}`} placeholder="e.g. Jeanette" />
						{fieldErrors.names && <div className="text-red-600 text-xs mt-1">{fieldErrors.names}</div>}
					</div>
					<div>
						<label className="block font-semibold mb-1">Phone Number *</label>
										<input name="phone" type="tel" required value={form.phone} onChange={handleChange} className={`input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${fieldErrors.phone ? 'border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500' : ''}`} pattern="[0-9\-\+ ]{8,}" placeholder="e.g. 0723031929" />
						{fieldErrors.phone && <div className="text-red-600 text-xs mt-1">{fieldErrors.phone}</div>}
					</div>
					<div>
						<label className="block font-semibold mb-1">Date of Birth *</label>
										<input name="dob" type="date" required value={form.dob} onChange={handleChange} className={`input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${fieldErrors.dob ? 'border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500' : ''}`} placeholder="YYYY-MM-DD" />
						{fieldErrors.dob && <div className="text-red-600 text-xs mt-1">{fieldErrors.dob}</div>}
					</div>
					<div>
						<label className="block font-semibold mb-1">Chessa ID</label>
										<input name="chessaId" value={form.chessaId} onChange={handleChange} className="input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500" placeholder="e.g. 123456" />
					</div>
					<div>
						<label className="block font-semibold mb-1">Rating</label>
										<input name="rating" type="number" value={form.rating} onChange={handleChange} className="input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500" placeholder="e.g. 1200" />
					</div>
				</div>
							<div className="grid md:grid-cols-2 gap-4">
					<div>
						<label className="block font-semibold mb-1">Emergency Contact Name *</label>
										<input name="emergencyName" required value={form.emergencyName} onChange={handleChange} className={`input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${fieldErrors.emergencyName ? 'border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500' : ''}`} placeholder="e.g. Parent/Guardian Name" />
						{fieldErrors.emergencyName && <div className="text-red-600 text-xs mt-1">{fieldErrors.emergencyName}</div>}
					</div>
					<div>
						<label className="block font-semibold mb-1">Emergency Contact Phone *</label>
										<input name="emergencyPhone" type="tel" required value={form.emergencyPhone} onChange={handleChange} className={`input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${fieldErrors.emergencyPhone ? 'border-rose-500 ring-2 ring-rose-400 dark:border-rose-500 dark:ring-rose-500' : ''}`} pattern="[0-9\-\+ ]{8,}" placeholder="e.g. 0821234567" />
						{fieldErrors.emergencyPhone && <div className="text-red-600 text-xs mt-1">{fieldErrors.emergencyPhone}</div>}
					</div>
				</div>
							<div>
								<label className="block font-semibold mb-1">Comments</label>
								<textarea name="comments" value={form.comments} onChange={handleChange} className="input w-full py-3 px-3 rounded-md border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-400 dark:focus:ring-blue-900 text-base placeholder:text-gray-400 dark:placeholder:text-zinc-500" rows={2} placeholder="Any comments or special requirements?" />
							</div>
			</div>
			{/* 5. Payment Info */}
					<div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-2 text-sm md:text-base transition-colors">
				<div className="font-bold mb-1">Payment Method: [Payment Method Placeholder]</div>
				<div>
					<div><b>Bank:</b> [Bank Name]</div>
					<div><b>Account Holder:</b> [Account Holder]</div>
					<div><b>Account Number:</b> [Account Number]</div>
					<div><b>Branch Code:</b> [Branch Code]</div>
					<div><b>Reference:</b> [Reference Format]</div>
				</div>
			</div>
			{/* 6. Submit Section */}
					<div className="pt-4">
						{error && <div className="mb-3 text-rose-700 dark:text-rose-400 text-center font-semibold bg-rose-50 dark:bg-zinc-900 border border-rose-200 dark:border-rose-700 rounded p-2">{error}</div>}
						<button type="submit" className="w-full py-3 rounded-lg bg-blue-700 dark:bg-blue-600 text-white font-bold text-lg hover:bg-blue-800 dark:hover:bg-blue-700 transition disabled:opacity-50" disabled={submitting || !form.section}>
							{submitting ? <span className="animate-spin mr-2">⏳</span> : null}
							Register for Tournament
						</button>
					</div>
		</form>
	);
}