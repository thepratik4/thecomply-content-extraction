export interface ExtractedTable {
  type: "table";
  columns: string[];
  rows: string[][];
}

export interface ExtractedSection {
  id: string;
  heading: string;
  level: number;
  text: string;
  page: number;
  char_count: number;
  /** Structured tables extracted from pages belonging to this section */
  tables?: ExtractedTable[];
}


export const MOCK_EXTRACTION_DATA: ExtractedSection[] = [
  {
    id: "section-1",
    heading: "Table of Contents",
    level: 1,
    page: 1,
    text: "User Usage Agreement\nAttachments: Usage Agreement Usage Agreement.pdf\nSupporting Document: Revised Statement of Variability P 22550-I [Expanded SOV].pdf\nRedline Version P 22550-I [Expanded SOV] -redline.pdf",
    char_count: 228
  },
  {
    id: "section-2",
    heading: "Filing at a Glance",
    level: 1,
    page: 2,
    text: "Company: American General Life Insurance Company\nProduct Name: Expanded SOV\nState: Maryland\nTOI: A05G Group Annuities - Immediate Non-Variable\nSub-TOI: A05G.000 Annuities - Immediate Non-variable\nFiling Type: Form\nDate Submitted: 06/29/2026\nSERFF Status: Closed-Received and filed",
    char_count: 279
  },
  {
    id: "section-3",
    heading: "General Information",
    level: 1,
    page: 3,
    text: "Project Name: Status of Filing in Domicile: Pending\nProject Number: Date Approved in Domicile:\nRequested Filing Mode: Informational Domicile Status Comments:\nExplanation for Combination/Other: Market Type: Group\nSubmission Type: New Submission Group Market Size: Small and Large\nGroup Market Type: Employer Overall Rate Impact:\nFiling Status Changed: 08/17/2026\nState Status Changed: Deemer Date:\nCreated By: Aileen Apuy Submitted By: Aileen Apuy",
    char_count: 428
  },
  {
    id: "section-4",
    heading: "Company and Contact",
    level: 1,
    page: 3,
    text: "Filing Contact Information\nAileen Apuy, Manager, State Filings\naileen.apuy@corebridgefinancial.com\n108800 Wilshire Blvd Suite 1101 Los Angeles, CA 90024\n424-537-8915 [Phone]",
    char_count: 177
  },
  {
    id: "section-5",
    heading: "Filing Fees",
    level: 1,
    page: 5,
    text: "State Fees\nFee Required? Yes\nFee Amount: $125.00\nRetaliatory? No\nFee Explanation: $125 per form x 1 form\nPer Company: No\nCompany Amount Date Processed Transaction #\nAmerican General Life Insurance Company $125.00 06/29/2026 03:14 PM 350596425\nEFT Total: $125.00",
    char_count: 260
  },
  {
    id: "section-6",
    heading: "Correspondence Summary",
    level: 1,
    page: 6,
    text: "Dispositions Status: Received and filed\nCreated By: Sebastian Schenk\nDate Submitted: 08/17/2026\nObjection Letters Status: Objection Letter Sent\nSubmitted Date: 08/13/2026\nResponse Letters Status: Submitted to State\nSubmitted Date: 08/13/2026",
    char_count: 236
  },
  {
    id: "section-7",
    heading: "Disposition",
    level: 1,
    page: 7,
    text: "Disposition Date: 08/17/2026\nEffective Date: Immediate\nStatus: Received and filed\nComment: Please be advised of our acceptance of a revised Statement of Variability for Group Immediate Non-Variable Annuity product filed on behalf of American General Life Insurance Company.",
    char_count: 261
  },
  {
    id: "section-8",
    heading: "Objection Letter",
    level: 1,
    page: 9,
    text: "Objection Letter Status: Objection Letter Sent\nObjection Letter Date: 08/13/2026\nDear Aileen Apuy,\nIntroduction: We received your submission regarding the Expanded SOV filing. Please review the highlighted sections regarding variable text provisions and confirm submission of specimen schedules.",
    char_count: 288
  },
  {
    id: "section-9",
    heading: "Response Letter",
    level: 1,
    page: 10,
    text: "Response Letter Status: Submitted to State\nResponse Letter Date: 08/13/2026\nDear Sebastian Schenk,\nIntroduction: Please see our response attached regarding variable text provisions. We have updated the Statement of Variability accordingly to align with state guidelines.",
    char_count: 260
  },
  {
    id: "section-10",
    heading: "Note To Reviewer",
    level: 1,
    page: 11,
    text: "Created By: Aileen Apuy on 08/13/2026 10:48 AM\nLast Edited By: Sebastian Schenk\nSubmitted On: 08/17/2026 10:31 AM\nSubject: Updated Objection Response\nComments: Please review revised redline document included under Supporting Document Schedules.",
    char_count: 247
  },
  {
    id: "section-11",
    heading: "Supporting Document Schedules",
    level: 1,
    page: 12,
    text: "Bypassed - Item: Actuarial Memorandum\nBypass Reason: N/A\nSatisfied - Item: Variable Text Description\nComments: Provided SOV under Department review.\nAttachment: P 22550-I [Expanded SOV].pdf\nItem Status: Received and Filed\nSatisfied - Item: Redline Version\nAttachment: P 22550-I [Expanded SOV] -redline.pdf",
    char_count: 310
  }
];
