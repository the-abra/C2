import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripANSI(str: string): string {
  if (!str) return ''
  return str
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // strip standard ANSI escape codes
    .replace(/\[\d+(;\d+)*[mK]/g, '')       // strip residual bracket color codes like [92m, [0m
    .replace(/\[0m/g, '')
    .trim()
}
