/**
 * FHIR R4 Bundle builder for partner integration testing.
 * Produces a `Bundle` of type `collection` with Patient, Encounter,
 * Practitioner, Observations (screening scores + MSE), Condition,
 * RiskAssessment, Composition, AuditEvent.
 *
 * NOT for production clinical use. No PII.
 * Profiles loosely aligned to AU Base 4.x and US Core 6.x.
 */

import { SCREENING_INSTRUMENTS, LOINC_SYSTEM } from "@/lib/screening/scoringUtils";
import type { SampleNarrative } from "./sampleNarratives";

const ICD10_AM = "http://terminology.hl7.org.au/CodeSystem/icd-10-am";
const APERTA_BASE = "https://aperta-health.app/fhir";
const AU_BASE_VISA = "http://hl7.org.au/fhir/StructureDefinition/visa-subclass";

const newUuid = () =>
  // RFC4122 v4 — adequate for sandbox payloads
  (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

const isoNow = () => new Date().toISOString();
const isoMinusDays = (d: number) =>
  new Date(Date.now() - d * 86400000).toISOString();

export function buildSampleBundle(narrative: SampleNarrative) {
  const patientId = newUuid();
  const encounterId = newUuid();
  const practitionerId = newUuid();
  const compositionId = newUuid();
  const conditionId = newUuid();
  const riskId = newUuid();
  const auditId = newUuid();

  const patient = {
    resourceType: "Patient",
    id: patientId,
    meta: { profile: ["http://hl7.org.au/fhir/StructureDefinition/au-patient"] },
    identifier: [
      {
        system: `${APERTA_BASE}/identifier/pseudonymous`,
        value: `APRT-${narrative.id.toUpperCase()}`,
      },
    ],
    extension: [
      {
        url: "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
        valueAddress: { country: narrative.countryOfBirth },
      },
      {
        url: AU_BASE_VISA,
        valueCoding: {
          system: "https://immi.homeaffairs.gov.au/CodeSystem/visa-subclass",
          code: narrative.visaStatus,
          display: `Subclass ${narrative.visaStatus}`,
        },
      },
    ],
    gender: narrative.gender,
    communication: [
      {
        language: {
          coding: [
            {
              system: "urn:ietf:bcp:47",
              code: narrative.language,
              display: narrative.languageDisplay,
            },
          ],
        },
        preferred: true,
      },
    ],
  };

  const practitioner = {
    resourceType: "Practitioner",
    id: practitionerId,
    identifier: [{ system: `${APERTA_BASE}/identifier/practitioner`, value: "APRT-CLN-001" }],
    name: [{ family: "Aperta", given: ["Sandbox Clinician"], use: "anonymous" }],
    qualification: [
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "MD",
              display: "Doctor of Medicine",
            },
          ],
          text: "Psychiatrist (sandbox)",
        },
      },
    ],
  };

  const encounter = {
    resourceType: "Encounter",
    id: encounterId,
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    type: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "165171009",
            display: "Mental health assessment",
          },
        ],
      },
    ],
    subject: { reference: `Patient/${patientId}` },
    participant: [
      {
        individual: { reference: `Practitioner/${practitionerId}` },
      },
    ],
    period: { start: isoMinusDays(1), end: isoNow() },
    reasonCode: [{ text: narrative.presenting }],
  };

  const screeningObservations = narrative.screenings.map((s) => {
    const inst = SCREENING_INSTRUMENTS[s.instrument];
    const coding = inst.loincScore
      ? [{ system: LOINC_SYSTEM, code: inst.loincScore, display: `${inst.name} total score` }]
      : [{ system: `${APERTA_BASE}/screening`, code: inst.id, display: `${inst.name} total score` }];
    return {
      resourceType: "Observation",
      id: newUuid(),
      status: "preliminary",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "survey",
            },
          ],
        },
      ],
      code: { coding, text: `${inst.name} total score` },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      effectiveDateTime: isoMinusDays(1),
      valueInteger: s.totalScore,
      interpretation: [
        {
          coding: [{ system: `${APERTA_BASE}/severity`, code: s.severityLevel }],
          text: s.severityLevel,
        },
      ],
      note: [
        { text: s.interpretation },
        { text: "AI-suggested score requiring clinician review (sandbox)." },
      ],
    };
  });

  const mseObservation = {
    resourceType: "Observation",
    id: newUuid(),
    status: "preliminary",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "exam",
          },
        ],
      },
    ],
    code: {
      coding: [{ system: LOINC_SYSTEM, code: "10190-7", display: "Mental status Narrative" }],
      text: "Mental State Examination",
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: isoMinusDays(1),
    valueString: narrative.mse,
  };

  const condition = {
    resourceType: "Condition",
    id: conditionId,
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "provisional",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "encounter-diagnosis",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: ICD10_AM,
          code: narrative.provisionalDiagnosis.icd10AmCode,
          display: narrative.provisionalDiagnosis.display,
        },
      ],
      text: narrative.provisionalDiagnosis.display,
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    recordedDate: isoNow(),
    note: [{ text: "AI-suggested provisional diagnosis. Requires clinician confirmation." }],
  };

  const riskAssessment = {
    resourceType: "RiskAssessment",
    id: riskId,
    status: "final",
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    occurrenceDateTime: isoNow(),
    prediction: [
      {
        outcome: { text: "Mental-health risk level" },
        qualitativeRisk: {
          coding: [{ system: `${APERTA_BASE}/risk-level`, code: narrative.riskLevel }],
          text: narrative.riskLevel,
        },
        rationale: narrative.riskFlags.join("; "),
      },
    ],
    note: narrative.riskFlags.map((f) => ({ text: f })),
  };

  const composition = {
    resourceType: "Composition",
    id: compositionId,
    status: "preliminary",
    type: {
      coding: [
        { system: LOINC_SYSTEM, code: "11488-4", display: "Consult note" },
      ],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    date: isoNow(),
    author: [{ reference: `Practitioner/${practitionerId}` }],
    title: `Case summary — ${narrative.label}`,
    section: [
      {
        title: "Presenting complaint",
        text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${narrative.presenting}</div>` },
      },
      {
        title: "History",
        text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${narrative.narrative}</div>` },
      },
      {
        title: "Mental State Examination",
        entry: [{ reference: `Observation/${mseObservation.id}` }],
      },
      {
        title: "Screening",
        entry: screeningObservations.map((o) => ({ reference: `Observation/${o.id}` })),
      },
      {
        title: "Provisional diagnosis",
        entry: [{ reference: `Condition/${conditionId}` }],
      },
      {
        title: "Risk assessment",
        entry: [{ reference: `RiskAssessment/${riskId}` }],
      },
    ],
  };

  const auditEvent = {
    resourceType: "AuditEvent",
    id: auditId,
    type: { system: "http://terminology.hl7.org/CodeSystem/audit-event-type", code: "rest", display: "RESTful Operation" },
    subtype: [{ system: "http://hl7.org/fhir/restful-interaction", code: "create" }],
    action: "C",
    recorded: isoNow(),
    outcome: "0",
    agent: [
      {
        who: { reference: `Practitioner/${practitionerId}` },
        requestor: true,
      },
    ],
    source: { observer: { display: "Aperta Health — FHIR Sandbox" } },
    entity: [{ what: { reference: `Composition/${compositionId}` } }],
  };

  const entries = [
    patient,
    practitioner,
    encounter,
    mseObservation,
    ...screeningObservations,
    condition,
    riskAssessment,
    composition,
    auditEvent,
  ].map((resource: any) => ({
    fullUrl: `urn:uuid:${resource.id}`,
    resource,
  }));

  return {
    resourceType: "Bundle",
    id: newUuid(),
    type: "collection",
    timestamp: isoNow(),
    meta: {
      tag: [
        { system: `${APERTA_BASE}/tags`, code: "sandbox", display: "Sandbox — not for clinical use" },
      ],
    },
    entry: entries,
  };
}

export function downloadBundle(bundle: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
