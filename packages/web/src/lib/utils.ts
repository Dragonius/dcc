import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function escapeRegExp(str: string) {
	return str.replace(/[.*+?^${}()|[\]\/\\]/g, "-");
}

export const discordUrl = "https://discord.gg/jZZ3pFpY3e";
export const downloadUrl = "https://github.com/Kilcekru/dcc/releases/download/v0.4.1/DCC-0.4.1-Setup.exe";
