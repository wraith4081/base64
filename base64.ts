enum Base64Variant {
	Standard,
	UrlSafe,
}

interface Base64Options {
	variant?: Base64Variant;
	padding?: boolean;
	lineLength?: number;
}

export default class Base64 {
	private static readonly STANDARD_CHARS =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	private static readonly URLSAFE_CHARS =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

	private static getChars(variant: Base64Variant): string {
		return variant === Base64Variant.UrlSafe
			? Base64.URLSAFE_CHARS
			: Base64.STANDARD_CHARS;
	}

	private static createLookup(variant: Base64Variant): {
		[char: string]: number;
	} {
		const chars = this.getChars(variant);
		const lookup: { [char: string]: number } = {};
		for (let i = 0; i < chars.length; i++) {
			lookup[chars[i]] = i;
		}
		return lookup;
	}

	/**
	 * @param bytes - The input data as a Uint8Array.
	 * @param options - Optional settings for encoding.
	 */
	static encode(bytes: Uint8Array, options: Base64Options = {}): string {
		const {
			variant = Base64Variant.Standard,
			padding = true,
			lineLength = 0,
		} = options;

		const chars = this.getChars(variant);
		let base64 = '';
		const len = bytes.length;
		let i: number;
		let lineCharCount = 0;

		for (i = 0; i < len - 2; i += 3) {
			const combined =
				(bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
			base64 += chars[(combined >> 18) & 0x3f];
			base64 += chars[(combined >> 12) & 0x3f];
			base64 += chars[(combined >> 6) & 0x3f];
			base64 += chars[combined & 0x3f];

			if (lineLength > 0) {
				lineCharCount += 4;
				if (lineCharCount >= lineLength) {
					base64 += '\r\n';
					lineCharCount = 0;
				}
			}
		}

		if (i < len) {
			const remainingBytes = len - i;
			let combined = bytes[i] << 16;

			if (remainingBytes === 2) {
				combined |= bytes[i + 1] << 8;
			}

			base64 += chars[(combined >> 18) & 0x3f];
			base64 += chars[(combined >> 12) & 0x3f];
			base64 +=
				remainingBytes === 2
					? chars[(combined >> 6) & 0x3f]
					: padding
					? '='
					: '';
			base64 += padding ? '=' : '';

			if (lineLength > 0 && base64[base64.length - 1] !== '\n') {
				base64 += '\r\n';
			}
		}

		return base64;
	}

	/**
	 * @param base64 - The Base64 encoded string.
	 * @param options - Optional settings for decoding.
	 */
	static decode(base64: string, options: Base64Options = {}): Uint8Array {
		const { variant = Base64Variant.Standard, padding = true } = options;

		const chars = this.getChars(variant);
		const lookup = this.createLookup(variant);

		// remove all non-b64 characters
		const regex =
			variant === Base64Variant.Standard
				? /[^A-Za-z0-9+/=]/g
				: /[^A-Za-z0-9\-_]/g;

		base64 = base64.replace(regex, '');

		if (padding && base64.length % 4 !== 0) {
			throw new Error('Invalid Base64 string length.');
		}

		const len = base64.length;
		const paddingChars = padding
			? base64.endsWith('==')
				? 2
				: +base64.endsWith('=')
			: 0;
		const outputLen = ((len * 3) >> 2) - paddingChars;
		const bytes = new Uint8Array(outputLen);

		let byteIndex = 0;
		for (let i = 0; i < len; ) {
			const combined = [3, 2, 1, 0].reduce(
				(cur, j) => cur | ((lookup[base64[i++]] ?? 0) << (j * 6)),
				0
			);

			if (byteIndex < outputLen)
				bytes[byteIndex++] = (combined >> 16) & 0xff;
			if (byteIndex < outputLen)
				bytes[byteIndex++] = (combined >> 8) & 0xff;
			if (byteIndex < outputLen) bytes[byteIndex++] = combined & 0xff;
		}

		return bytes;
	}

	/**
	 * Encodes a Unicode string to a Base64 string.
	 *
	 * @param input - The input string.
	 * @param options - Optional settings for encoding.
	 */
	static encodeString(input: string, options: Base64Options = {}): string {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(input);
		return this.encode(bytes, options);
	}

	/**
	 * Decodes a Base64 string to a Unicode string.
	 *
	 * @param base64 - The Base64 encoded string.
	 * @param options - Optional settings for decoding.
	 */
	static decodeString(base64: string, options: Base64Options = {}): string {
		const bytes = this.decode(base64, options);
		const decoder = new TextDecoder();
		return decoder.decode(bytes);
	}
}
