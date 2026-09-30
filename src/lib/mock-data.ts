import type {
  Client,
  DocumentTemplate,
  GeneratedDocument,
  MonthSummary,
  Order,
  Provider,
  Tariffs,
  Vehicle,
} from "./types";

/**
 * Hardcoded data used while there is no backend (NEXT_PUBLIC_API_URL unset).
 * Tariffs come from "Servicios MTColectivo 2025.xlsx"; people are fictional.
 */

export const providers: Provider[] = [
  { id: "prv-mtc", name: "MT Colectivo", own: true },
  { id: "prv-vagon", name: "VagonTravel", own: false },
  { id: "prv-davila", name: "Dávila Tours", own: false },
  { id: "prv-lomeli", name: "Transportes Lomelí", own: false },
  { id: "prv-guzman", name: "Guzmán Traslados", own: false },
];

export const tariffs: Tariffs = {
  year: 2026,
  amatitan: {
    am: {
      normal: { 6: 2500, 14: 5000, 20: 6000, 45: 9500 },
      discount: { 6: 2250, 14: 4500, 20: 5500, 45: 9000 },
    },
    pm: {
      normal: { 6: 3000, 14: 5500, 20: 6500, 45: 10000 },
      discount: { 6: 2500, 14: 5000, 20: 6000, 45: 9500 },
    },
  },
  eventos: {
    normal: { 6: 2500, 14: 4500, 20: 5500, 45: 9500 },
    discount: { 6: 2000, 14: 4000, 20: 5000, 45: 9000 },
  },
  turismo: [
    { destination: "Mazatlán", prices: { 6: [null, 12500, 13500], 14: [null, 17500, 18000], 20: [null, 20500, 21500] } },
    { destination: "Puerto Vallarta", prices: { 6: [9500, 10500, 11500], 14: [12500, 13500, 14500], 20: [14000, 15000, 16000] } },
    { destination: "Manzanillo", prices: { 6: [8500, 9500, 10500], 14: [11500, 12500, 13500], 20: [13000, 14000, 14500] } },
    { destination: "Guanajuato", prices: { 6: [8500, 9500, 10500], 14: [11500, 12500, 13500], 20: [13000, 14000, 15000] } },
    { destination: "Morelia", prices: { 6: [8500, 9500, 10500], 14: [11500, 12500, 13500], 20: [13000, 14000, 15000] } },
    { destination: "Tepic", prices: { 6: [8000, 9000, 10000], 14: [10500, 11500, 12500], 20: [12000, 13000, 14000] } },
    { destination: "Tapalpa", prices: { 6: [5000, 6500, 7500], 14: [7500, 8500, 9500], 20: [9000, 10000, 11000] } },
    { destination: "Mazamitla", prices: { 6: [5000, 6500, 7500], 14: [7500, 8500, 9500], 20: [9000, 10000, 11000] } },
    { destination: "Chapala", prices: { 6: [3000, 3500, 4000], 14: [5500, 6000, 6500], 20: [6500, 7000, 7500] } },
    { destination: "Tequila", prices: { 6: [3000, 3500, 4000], 14: [5500, 6000, 6500], 20: [6500, 7000, 7500] } },
  ],
  extras: {
    6: { hour: 250, move: 500 },
    14: { hour: 500, move: 1000 },
    20: { hour: 500, move: 1000 },
    45: { hour: 1000, move: 2000 },
  },
  tourShiftSurcharge: { am: 0, pm: 500, full: 1000 },
};

export const clients: Client[] = [
  { id: "cli-001", name: "Daniela Ortiz", phone: "33 1304 3029", email: "daniela.ortiz@correo.mx", contractSigned: true, servicesCount: 4, totalContracted: 19500, balanceDue: 3750, balanceLate: false, lastService: { label: "Amatitán · Van 14", when: "Próximo: dom 4 oct" } },
  { id: "cli-002", name: "Luis Zamora", phone: "33 3624 1170", email: "luis.zamora@correo.mx", contractSigned: true, servicesCount: 6, totalContracted: 21000, balanceDue: 0, balanceLate: false, lastService: { label: "Turismo Chapala · Van 6", when: "27 sep" } },
  { id: "cli-003", name: "Ernesto Villa", phone: "33 1987 4405", email: "ernesto.villa@correo.mx", contractSigned: true, servicesCount: 3, totalContracted: 32500, balanceDue: 0, balanceLate: false, lastService: { label: "Amatitán · Autobús 45 + Van 14", when: "20 sep" } },
  { id: "cli-004", name: "Jimena Solís", phone: "33 1304 7788", email: "jimena.solis@correo.mx", contractSigned: true, servicesCount: 2, totalContracted: 10000, balanceDue: 2500, balanceLate: false, lastService: { label: "Amatitán · Van 14", when: "Próximo: sáb 3 oct" } },
  { id: "cli-005", name: "Benjamín Cruz", phone: "33 2211 9087", email: "benjamin.cruz@correo.mx", contractSigned: true, servicesCount: 1, totalContracted: 9500, balanceDue: 4750, balanceLate: false, lastService: { label: "Amatitán · Autobús 45", when: "Próximo: dom 4 oct" } },
  { id: "cli-006", name: "Sebastián Fuentes", phone: "33 3342 5510", email: "sebastian.fuentes@correo.mx", contractSigned: true, servicesCount: 1, totalContracted: 6000, balanceDue: 4500, balanceLate: true, lastService: { label: "Amatitán · Van 20", when: "28 sep" } },
  { id: "cli-007", name: "Mauricio Rivas", phone: "33 1590 2231", email: "mauricio.rivas@correo.mx", contractSigned: true, servicesCount: 1, totalContracted: 4500, balanceDue: 0, balanceLate: false, lastService: { label: "Evento · boda · Van 14", when: "Próximo: sáb 3 oct" } },
  { id: "cli-008", name: "Diana Robles", phone: "33 2764 0012", email: "diana.robles@correo.mx", contractSigned: true, servicesCount: 1, totalContracted: 5000, balanceDue: 0, balanceLate: false, lastService: { label: "Amatitán · Van 14", when: "27 sep" } },
  { id: "cli-009", name: "Andrea Navarro", phone: "33 3102 6674", email: "andrea.navarro@correo.mx", contractSigned: false, servicesCount: 0, totalContracted: 0, balanceDue: 0, balanceLate: false, lastService: { label: "Cotización: Guanajuato 2 días", when: "Enviada 25 sep" } },
  { id: "cli-010", name: "Paola Medina", phone: "33 1478 9931", email: "paola.medina@correo.mx", contractSigned: false, servicesCount: 0, totalContracted: 0, balanceDue: 0, balanceLate: false, lastService: { label: "Cotización: graduación · Van 20", when: "Enviada hoy" } },
];

const ama = (shift: "am" | "pm") => ({ type: "amatitan" as const, amatitanShift: shift });
const round = { route: "round" as const };

export const orders: Order[] = [
  { id: "ord-0932", folio: "OS-2026-0932", clientId: "cli-010", clientName: "Paola Medina", clientPhone: "33 1478 9931", service: { type: "evento", eventDescription: "Graduación" }, date: "2026-10-10", departureTime: "20:00", returnTime: "02:00", ...round, origin: "Av. Vallarta 3040, Guadalajara", destination: "Salón Lago del Rey, Guadalajara", passengers: 18, units: [20], providerId: "prv-mtc", providerName: "MT Colectivo", lines: [{ qty: 1, concept: "Van 20 pasajeros · Ida y vuelta · Evento · Graduación", amount: 5500 }], total: 5500, payments: [], providerCost: 0, status: "quote", contractSigned: false, issuedAt: "2026-09-29" },
  { id: "ord-0931", folio: "OS-2026-0931", clientId: "cli-001", clientName: "Daniela Ortiz", clientPhone: "33 1304 3029", service: ama("pm"), date: "2026-10-04", departureTime: "13:00", returnTime: "20:00", ...round, origin: "Av. Patria 1891, Jardines Universidad, Zapopan", destination: "Cantaritos El Güero, Amatitán", passengers: 12, units: [14], providerId: "prv-vagon", providerName: "VagonTravel", lines: [{ qty: 1, concept: "Van 14 pasajeros · Ida y vuelta · Amatitán, horario vespertino", amount: 5500 }, { qty: null, concept: "Descuento", amount: -500 }], total: 5000, payments: [{ id: "pay-1", amount: 1250, date: "2026-09-26", method: "Transferencia" }], providerCost: 4000, status: "deposit", contractSigned: true, issuedAt: "2026-09-26" },
  { id: "ord-0930", folio: "OS-2026-0930", clientId: "cli-007", clientName: "Mauricio Rivas", clientPhone: "33 1590 2231", service: { type: "evento", eventDescription: "Boda" }, date: "2026-10-03", departureTime: "20:00", returnTime: "02:00", ...round, origin: "Calle Libertad 1520, Guadalajara", destination: "Hacienda La Cañada, Tlajomulco", passengers: 14, units: [14], providerId: "prv-vagon", providerName: "VagonTravel", lines: [{ qty: 1, concept: "Van 14 pasajeros · Ida y vuelta · Evento · Boda", amount: 4500 }], total: 4500, payments: [{ id: "pay-2", amount: 2000, date: "2026-09-18", method: "Transferencia" }, { id: "pay-3", amount: 2500, date: "2026-09-24", method: "Efectivo" }], providerCost: 4000, status: "paid", contractSigned: true, issuedAt: "2026-09-17" },
  { id: "ord-0929", folio: "OS-2026-0929", clientId: "cli-004", clientName: "Jimena Solís", clientPhone: "33 1304 7788", service: ama("pm"), date: "2026-10-03", departureTime: "12:30", returnTime: "19:30", ...round, origin: "Constancio Hernández Alvirde 95, Col. Americana", destination: "Cantaritos El Güero, Amatitán", passengers: 13, units: [14], providerId: "prv-davila", providerName: "Dávila Tours", lines: [{ qty: 1, concept: "Van 14 pasajeros · Ida y vuelta · Amatitán, horario vespertino", amount: 5500 }, { qty: null, concept: "Descuento", amount: -500 }], total: 5000, payments: [{ id: "pay-4", amount: 2500, date: "2026-09-20", method: "Transferencia" }], providerCost: 4250, status: "deposit", contractSigned: true, issuedAt: "2026-09-19" },
  { id: "ord-0928", folio: "OS-2026-0928", clientId: "cli-005", clientName: "Benjamín Cruz", clientPhone: "33 2211 9087", service: ama("am"), date: "2026-10-04", departureTime: "09:00", returnTime: "16:00", ...round, origin: "Plaza Andares, Zapopan", destination: "Cantaritos El Güero, Amatitán", passengers: 38, units: [45], providerId: "prv-lomeli", providerName: "Transportes Lomelí", lines: [{ qty: 1, concept: "Autobús 45 pasajeros · Ida y vuelta · Amatitán, horario matutino", amount: 9500 }], total: 9500, payments: [{ id: "pay-5", amount: 4750, date: "2026-09-22", method: "Transferencia" }], providerCost: 7500, status: "deposit", contractSigned: true, issuedAt: "2026-09-21" },
  { id: "ord-0927", folio: "OS-2026-0927", clientId: "cli-009", clientName: "Andrea Navarro", clientPhone: "33 3102 6674", service: { type: "turismo", destination: "Guanajuato", days: 2 }, date: "2026-10-11", departureTime: "07:00", returnTime: "20:00", ...round, origin: "Minerva, Guadalajara", destination: "Guanajuato, Gto.", passengers: 17, units: [20], providerId: "prv-mtc", providerName: "MT Colectivo", lines: [{ qty: 1, concept: "Van 20 pasajeros · Ida y vuelta · Turismo Guanajuato · 2 días", amount: 14000 }], total: 14000, payments: [], providerCost: 0, status: "quote", contractSigned: false, issuedAt: "2026-09-25" },
  { id: "ord-0926", folio: "OS-2026-0926", clientId: "cli-006", clientName: "Sebastián Fuentes", clientPhone: "33 3342 5510", service: ama("pm"), date: "2026-09-28", departureTime: "13:00", returnTime: "20:00", ...round, origin: "Av. Chapultepec 480, Guadalajara", destination: "Cantaritos El Güero, Amatitán", passengers: 20, units: [20], providerId: "prv-guzman", providerName: "Guzmán Traslados", lines: [{ qty: 1, concept: "Van 20 pasajeros · Ida y vuelta · Amatitán, horario vespertino", amount: 6500 }, { qty: null, concept: "Descuento", amount: -500 }], total: 6000, payments: [{ id: "pay-6", amount: 1500, date: "2026-09-15", method: "Transferencia" }], providerCost: 5000, status: "late", contractSigned: true, issuedAt: "2026-09-14" },
  { id: "ord-0925", folio: "OS-2026-0925", clientId: "cli-002", clientName: "Luis Zamora", clientPhone: "33 3624 1170", service: { type: "turismo", destination: "Chapala", days: 1, tourShift: "am" }, date: "2026-09-27", departureTime: "09:00", returnTime: "14:00", ...round, origin: "Providencia, Guadalajara", destination: "Malecón de Chapala", passengers: 5, units: [6], providerId: "prv-mtc", providerName: "MT Colectivo", lines: [{ qty: 1, concept: "Van 6 pasajeros · Ida y vuelta · Turismo Chapala · mismo día", amount: 3000 }], total: 3000, payments: [{ id: "pay-7", amount: 3000, date: "2026-09-20", method: "Transferencia" }], providerCost: 0, status: "done", contractSigned: true, issuedAt: "2026-09-19" },
  { id: "ord-0924", folio: "OS-2026-0924", clientId: "cli-008", clientName: "Diana Robles", clientPhone: "33 2764 0012", service: ama("am"), date: "2026-09-27", departureTime: "09:00", returnTime: "16:00", ...round, origin: "Av. México 2800, Guadalajara", destination: "Cantaritos El Güero, Amatitán", passengers: 11, units: [14], providerId: "prv-vagon", providerName: "VagonTravel", lines: [{ qty: 1, concept: "Van 14 pasajeros · Ida y vuelta · Amatitán, horario matutino", amount: 5000 }], total: 5000, payments: [{ id: "pay-8", amount: 5000, date: "2026-09-25", method: "Transferencia" }], providerCost: 4000, status: "done", contractSigned: true, issuedAt: "2026-09-18" },
  { id: "ord-0923", folio: "OS-2026-0923", clientId: "cli-003", clientName: "Ernesto Villa", clientPhone: "33 1987 4405", service: ama("pm"), date: "2026-09-20", departureTime: "13:00", returnTime: "20:00", ...round, origin: "Puerta de Hierro, Zapopan", destination: "Cantaritos El Güero, Amatitán", passengers: 56, units: [45, 14], providerId: "prv-lomeli", providerName: "Transportes Lomelí", lines: [{ qty: 1, concept: "Autobús 45 pasajeros · Ida y vuelta · Amatitán, horario vespertino", amount: 10000 }, { qty: 1, concept: "Van 14 pasajeros · Ida y vuelta · Amatitán, horario vespertino", amount: 5500 }, { qty: null, concept: "Descuento", amount: -1000 }], total: 14500, payments: [{ id: "pay-9", amount: 14500, date: "2026-09-12", method: "Transferencia" }], providerCost: 12000, status: "done", contractSigned: true, issuedAt: "2026-09-10" },
];

export const vehicles: Vehicle[] = [
  { id: "veh-1", code: "MTC-14A", capacity: 14, kind: "van", providerId: "prv-mtc", providerName: "MT Colectivo", model: "Toyota Hiace 2023", plates: "JKX-4127", driver: "Luis Hernández", servicesThisMonth: 9, costPerService: 0, nextService: "Próximo: 4 oct · Amatitán" },
  { id: "veh-2", code: "MTC-20A", capacity: 20, kind: "van", providerId: "prv-mtc", providerName: "MT Colectivo", model: "Mercedes Sprinter 2022", plates: "JKX-5590", driver: "Óscar Luna", servicesThisMonth: 7, costPerService: 0, nextService: "Próximo: 10 oct · Graduación" },
  { id: "veh-3", code: "MTC-06A", capacity: 6, kind: "van", providerId: "prv-mtc", providerName: "MT Colectivo", model: "Toyota Sienna 2023", plates: "JMS-1042", driver: "Ricardo Pérez", servicesThisMonth: 5, costPerService: 0, nextService: null },
  { id: "veh-4", code: "VT-14A", capacity: 14, kind: "van", providerId: "prv-vagon", providerName: "VagonTravel", model: "Toyota Hiace 2022", plates: "JLT-3310", driver: null, servicesThisMonth: 11, costPerService: 4000, nextService: "Próximo: 3 oct · Boda" },
  { id: "veh-5", code: "VT-20A", capacity: 20, kind: "van", providerId: "prv-vagon", providerName: "VagonTravel", model: "Mercedes Sprinter 2023", plates: "JLT-2208", driver: null, servicesThisMonth: 6, costPerService: 5000, nextService: null },
  { id: "veh-6", code: "DT-14A", capacity: 14, kind: "van", providerId: "prv-davila", providerName: "Dávila Tours", model: "Nissan Urvan 2021", plates: "JMS-2276", driver: null, servicesThisMonth: 8, costPerService: 4250, nextService: "Próximo: 3 oct · Amatitán" },
  { id: "veh-7", code: "LOM-45A", capacity: 45, kind: "bus", providerId: "prv-lomeli", providerName: "Transportes Lomelí", model: "Volvo 9800 2021", plates: "JLT-4453", driver: null, servicesThisMonth: 4, costPerService: 7500, nextService: "Próximo: 4 oct · Amatitán" },
  { id: "veh-8", code: "GZ-20A", capacity: 20, kind: "van", providerId: "prv-guzman", providerName: "Guzmán Traslados", model: "Mercedes Sprinter 2021", plates: "JPZ-7781", driver: null, servicesThisMonth: 3, costPerService: 5000, nextService: null },
  { id: "veh-9", code: "GZ-14A", capacity: 14, kind: "van", providerId: "prv-guzman", providerName: "Guzmán Traslados", model: "Toyota Hiace 2021", plates: "JPZ-6624", driver: null, servicesThisMonth: 2, costPerService: 4000, nextService: null },
];

export const monthSummary: MonthSummary = {
  month: "2026-09",
  quoted: 98600,
  earned: 20850,
  quotedByType: { amatitan: 90000, evento: 8600, turismo: 0 },
  receivable: 15500,
  lateOrders: 1,
  upcoming7d: 6,
  upcomingDetail: "5 vans y 1 autobús · 3 proveedores",
};

const contractFields: DocumentTemplate["fields"] = [
  { id: "f1", page: 1, label: "Folio", variable: "order.folio", type: "text", x: 430, y: 90, w: 120, h: 22, required: true },
  { id: "f2", page: 1, label: "Fecha de emisión", variable: "order.issued", type: "date", x: 430, y: 116, w: 120, h: 22, required: true },
  { id: "f3", page: 1, label: "Cliente", variable: "client.name", type: "text", x: 150, y: 248, w: 230, h: 22, required: true },
  { id: "f4", page: 1, label: "Celular", variable: "client.phone", type: "text", x: 450, y: 248, w: 110, h: 22, required: false },
  { id: "f5", page: 1, label: "Fecha del servicio", variable: "service.date", type: "date", x: 190, y: 350, w: 280, h: 22, required: true },
  { id: "f6", page: 1, label: "Dirección de salida", variable: "service.origin", type: "text", x: 190, y: 378, w: 370, h: 22, required: true },
  { id: "f7", page: 1, label: "Destino", variable: "service.destination", type: "text", x: 190, y: 406, w: 370, h: 22, required: true },
  { id: "f8", page: 1, label: "Unidad", variable: "unit.capacity", type: "text", x: 190, y: 434, w: 280, h: 22, required: true },
  { id: "f9", page: 1, label: "Total", variable: "pay.total", type: "money", x: 110, y: 498, w: 110, h: 22, required: true },
  { id: "f10", page: 1, label: "Anticipo", variable: "pay.paid", type: "money", x: 310, y: 498, w: 100, h: 22, required: true },
  { id: "f11", page: 1, label: "Por liquidar", variable: "pay.due", type: "money", x: 490, y: 498, w: 80, h: 22, required: true },
  { id: "f12", page: 1, label: "Firma del cliente", variable: "sign.client", type: "sign", x: 60, y: 652, w: 200, h: 52, required: true },
];

export const templates: DocumentTemplate[] = [
  { id: "tpl-order", name: "Orden de servicio", kind: "order", trigger: "quote", fileName: "Orden de servicio.pdf", pages: 1, fields: contractFields.slice(0, 11), status: "published", sendByWhatsApp: true, requestSignature: false, updatedAt: "2026-09-02" },
  { id: "tpl-contract", name: "Contrato de prestación de servicios", kind: "contract", trigger: "deposit", fileName: "Contrato de prestación de servicios.pdf", pages: 2, fields: contractFields, status: "published", sendByWhatsApp: true, requestSignature: true, updatedAt: "2026-09-10" },
  { id: "tpl-receipt", name: "Recibo de pago", kind: "receipt", trigger: "payment", fileName: "Recibo de pago.pdf", pages: 1, fields: contractFields.slice(0, 7).concat(contractFields.slice(8, 11)), status: "published", sendByWhatsApp: true, requestSignature: false, updatedAt: "2026-08-21" },
  { id: "tpl-rules", name: "Reglamento del pasajero", kind: "other", trigger: "deposit", fileName: "Reglamento del pasajero.pdf", pages: 1, fields: [], status: "published", sendByWhatsApp: true, requestSignature: false, updatedAt: "2026-07-30" },
  { id: "tpl-tour", name: "Cotización turismo varios días", kind: "other", trigger: "manual", fileName: "Cotización turismo.pdf", pages: 1, fields: contractFields.slice(0, 7).map((f, i) => (i > 4 ? { ...f, variable: null } : f)), status: "draft", sendByWhatsApp: false, requestSignature: false, updatedAt: "2026-09-27" },
];

export const generatedDocuments: GeneratedDocument[] = [
  { id: "doc-1", templateName: "Orden de servicio", orderId: "ord-0932", orderFolio: "OS-2026-0932", clientName: "Paola Medina", createdAt: "2026-09-29T10:42:00", channel: "WhatsApp" },
  { id: "doc-2", templateName: "Recibo de pago", orderId: "ord-0931", orderFolio: "OS-2026-0931", clientName: "Daniela Ortiz", createdAt: "2026-09-26T18:15:00", channel: "WhatsApp" },
  { id: "doc-3", templateName: "Contrato de prestación de servicios", orderId: "ord-0931", orderFolio: "OS-2026-0931", clientName: "Daniela Ortiz", createdAt: "2026-09-26T18:14:00", channel: "Correo" },
];
