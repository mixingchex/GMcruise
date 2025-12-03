
const cases = [
    {
        name: "Standard Key (with real newlines)",
        input: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----",
        expected: true
    },
    {
        name: "Escaped Newlines (\\n string)",
        input: "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----",
        expected: true
    },
    {
        name: "Quoted and Escaped (\"...\\n...\")",
        input: "\"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\"",
        expected: true
    },
    {
        name: "Single Quoted ('...\\n...')",
        input: "'-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----'",
        expected: true
    }
];

function processKey(rawPrivateKey: string) {
    console.log(`\nProcessing: ${rawPrivateKey.substring(0, 20)}...`);

    let privateKey = rawPrivateKey.trim();

    // 따옴표로 감싸져 있다면 제거 (또는 JSON 문자열일 경우 파싱)
    if (privateKey.startsWith('"') || privateKey.startsWith("'")) {
        try {
            console.log("Attempting JSON parse...");
            // JSON 문자열로 파싱 시도 (이중 이스케이프 처리 등)
            // 주의: 작은 따옴표로 시작하는 경우는 JSON.parse가 실패하므로 별도 처리 필요할 수 있음
            if (privateKey.startsWith("'")) {
                throw new Error("Single quotes not supported by JSON.parse");
            }
            privateKey = JSON.parse(privateKey);
            console.log("JSON parse successful");
        } catch (e) {
            console.log("JSON parse failed or skipped, removing quotes manually");
            // 파싱 실패 시 단순 따옴표 제거
            privateKey = privateKey.replace(/^["']+|["']+$/g, '');
        }
    }

    // 이스케이프된 줄바꿈 문자를 실제 줄바꿈으로 변환
    privateKey = privateKey.replace(/\\n/g, '\n');

    return privateKey;
}

cases.forEach(c => {
    console.log(`\n--- Test Case: ${c.name} ---`);
    const processed = processKey(c.input);
    const hasBegin = processed.includes('-----BEGIN PRIVATE KEY-----');
    const hasEnd = processed.includes('-----END PRIVATE KEY-----');
    const hasRealNewline = processed.includes('\n') && !processed.includes('\\n');

    console.log(`Result:`);
    console.log(`- Has BEGIN: ${hasBegin}`);
    console.log(`- Has END: ${hasEnd}`);
    console.log(`- Has Real Newline: ${hasRealNewline}`);

    if (hasBegin && hasEnd && hasRealNewline) {
        console.log("✅ PASS");
    } else {
        console.log("❌ FAIL");
        console.log("Processed output:", processed);
    }
});
