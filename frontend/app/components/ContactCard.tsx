import { CONTACT } from "../lib/contacts";

export default function ContactCard() {
  return (
    <div className="contact-card">
      <span className="contact-label">Менеджер по продажам</span>
      <strong className="contact-name">{CONTACT.name}</strong>
      <a className="contact-phone" href={`tel:${CONTACT.tel}`}>
        {CONTACT.phone}
      </a>
      <small>Позвоните — ответим на вопросы и подготовим предложение</small>
    </div>
  );
}
