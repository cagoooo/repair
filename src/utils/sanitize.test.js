import { describe, it, expect } from 'vitest';
import { sanitizeText, isValidImageUrl, sanitizeFields } from './sanitize';

describe('sanitizeText', () => {
    it('應轉義 HTML 特殊字元', () => {
        expect(sanitizeText('<script>alert("XSS")</script>'))
            .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('應轉義 & 字元', () => {
        expect(sanitizeText('A & B')).toBe('A &amp; B');
    });

    it('應轉義單引號', () => {
        expect(sanitizeText("it's")).toBe('it&#x27;s');
    });

    it('對一般中文字串不做改動', () => {
        expect(sanitizeText('冷氣壞了，請派人修理')).toBe('冷氣壞了，請派人修理');
    });

    it('空字串應回傳空字串', () => {
        expect(sanitizeText('')).toBe('');
    });

    it('非字串類型應回傳空字串', () => {
        expect(sanitizeText(null)).toBe('');
        expect(sanitizeText(undefined)).toBe('');
        expect(sanitizeText(123)).toBe('');
    });
});

describe('isValidImageUrl', () => {
    it('應允許 Firebase Storage URL', () => {
        expect(isValidImageUrl(
            'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/image.jpg?alt=media'
        )).toBe(true);
    });

    it('應允許 storage.googleapis.com URL', () => {
        expect(isValidImageUrl(
            'https://storage.googleapis.com/bucket/image.png'
        )).toBe(true);
    });

    it('應允許 data URI (base64)', () => {
        expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('應拒絕一般外部 URL', () => {
        expect(isValidImageUrl('https://evil.com/hack.jpg')).toBe(false);
    });

    it('應拒絕 javascript: protocol', () => {
        expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
    });

    it('應拒絕空值或非字串', () => {
        expect(isValidImageUrl('')).toBe(false);
        expect(isValidImageUrl(null)).toBe(false);
        expect(isValidImageUrl(undefined)).toBe(false);
    });
});

describe('sanitizeFields', () => {
    it('應僅清理指定欄位', () => {
        const obj = { name: '<b>John</b>', age: 30, note: '<script>' };
        const result = sanitizeFields(obj, ['name', 'note']);
        expect(result.name).toBe('&lt;b&gt;John&lt;/b&gt;');
        expect(result.note).toBe('&lt;script&gt;');
        expect(result.age).toBe(30); // 未指定的欄位保持原樣
    });

    it('應不修改原始物件', () => {
        const obj = { name: '<b>John</b>' };
        sanitizeFields(obj, ['name']);
        expect(obj.name).toBe('<b>John</b>'); // 原物件不變
    });
});
