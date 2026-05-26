/**
 * aiService.js
 * Service for interacting with Google Gemini API to provide clinical suggestions.
 */

// API key is loaded from .env.local (git-ignored, never hardcoded in source).
// Create a .env.local file with: REACT_APP_GEMINI_API_KEY=your_key_here
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const MODEL_FALLBACKS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-flash-latest"
];

// Use v1 or v1beta depending on the model availability
const getApiUrl = (model, version = "v1") => `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;

/**
 * Generates a structured clinical visit proposal based on patient context.
 */
export const generateVisitSuggestion = async ({ symptoms, patient, history = "" }) => {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please add REACT_APP_GEMINI_API_KEY to .env.local");
    }

    const age = patient?.dob ? calculateAge(patient.dob) : "Unknown";
    const gender = patient?.gender === 1 ? "Male" : patient?.gender === 2 ? "Female" : "Unknown";

    const prompt = `
You are a clinical assistant for doctors. 
Based on the following patient data, generate a structured medical visit proposal.

PATIENT CONTEXT:
- Age: ${age}
- Gender: ${gender}
- Complaint: ${symptoms}
- Medical History: ${history}
- Chronic Diseases: ${patient?.chronicDiseases || "None"}
- Known Allergies: ${patient?.allergies || "None"}

RESPONSE FORMAT:
You must return only a valid JSON object with the following structure:
{
  "diagnosis": "Potential primary diagnosis name",
  "medications": [
    { "medicationName": "Drug Name", "dosage": "e.g. 500mg", "frequency": "e.g. twice daily", "duration": "e.g. 5 days", "instructions": "e.g. after meals" }
  ],
  "labs": [
    { "testName": "Test Name (e.g. CBC)" }
  ],
  "notes": "Brief clinical reasoning or advice"
}

RULES:
- Keep suggestions safe and evidence-based.
- Avoid risky assumptions; provide standard care proposals.
- Do not include any text outside the JSON object.
`;

    let lastError = null;

    for (const model of MODEL_FALLBACKS) {
        // Try both v1 and v1beta for each model
        for (const version of ["v1", "v1beta"]) {
            try {
                console.log(`[AI] Attempting generation with ${model} (${version})...`);
                const response = await fetch(getApiUrl(model, version), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": API_KEY
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    const msg = errorData.error?.message || "AI Request failed";

                    // If 404, we try the next version/model
                    if (response.status === 404) {
                        console.warn(`[AI] Model ${model} not found on ${version}.`);
                        lastError = new Error(msg);
                        continue;
                    }
                    throw new Error(msg);
                }

                const data = await response.json();
                let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

                // Clean markdown JSON wrapping if present
                textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

                return JSON.parse(textResponse);
            } catch (error) {
                lastError = error;
                console.error(`[AI] ${model} on ${version} error:`, error.message);
                // If it's a 404, the inner loop continues to the next version
                // If it's a structural error (like 400), we try the next model (outer loop continues if we don't re-throw)
            }
        }
    }

    throw lastError || new Error("All AI model fallbacks failed.");
};

/** Helper to calculate age from DOB string */
function calculateAge(dobString) {
    try {
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch {
        return "Unknown";
    }
}
