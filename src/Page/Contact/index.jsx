import React, { useState } from "react";
import ContactBox from "./ContactBox";
import Form from "./Form";
import CodeView from "./CodeView";
import SuccessModal from "./SuccessModal";
import useClickTrack from "../../Hooks/useClickTrack";
import usePageSEO from "../../Hooks/usePageSEO";

export default function Contact() {
  usePageSEO({
    title: "Contact | Get in Touch with Mohammad Mehdi Sadeghi",
    description: "Send a message or connect directly with Mohammad Mehdi Sadeghi for frontend engineering contracts, collaborations, or inquiries.",
  });

  const { trackClick } = useClickTrack();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [statusMessage, setStatusMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState({ name: "", phone: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setStatus("error");
      setStatusMessage("Please fill in your name and message.");
      return;
    }

    setStatus("sending");
    setStatusMessage("");

    const currentName = name;
    const currentPhone = phoneNumber;

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setStatus("success");
      setStatusMessage("Message sent! I'll get back to you soon.");
      setSubmittedData({ name: currentName, phone: currentPhone });
      setIsModalOpen(true);

      trackClick({
        targetType: "form",
        targetId: "contact-form",
        targetLabel: "Contact Form Submission",
      });
      setName("");
      setPhoneNumber("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setStatusMessage(err.message || "Something went wrong.");
    }
  };

  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] w-full flex flex-col md:flex-row md:h-[calc(100vh-116px)] md:overflow-hidden relative">
      <ContactBox />
      <Form
        name={name}
        setName={setName}
        setPhoneNumber={setPhoneNumber}
        message={message}
        setMessage={setMessage}
        onSubmit={handleSubmit}
        status={status}
        statusMessage={statusMessage}
      />
      <CodeView name={name} phoneNumber={phoneNumber} message={message} />

      <SuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        senderName={submittedData.name}
        phoneNumber={submittedData.phone}
      />
    </section>
  );
}
