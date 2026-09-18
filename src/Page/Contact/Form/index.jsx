import React, { useEffect, useMemo, useState } from "react";
import countryList from "react-select-country-list";
import { AsYouType, getCountryCallingCode } from "libphonenumber-js";

export default function Form({
  name,
  setName,
  setPhoneNumber,
  message,
  setMessage,
  onSubmit,
  status = "idle",
  statusMessage = "",
}) {
  const gray = "#90A1B9";
  const [country, setCountry] = useState("IR");
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    if (status === "success") {
      // Reset only the controlled state. Avoid form.reset() because it
      // resets the <select> DOM to its first option (e.g. AF) while React
      // state still says IR, leaving the dropdown out of sync.
      setCountry("IR");
      setPhoneInput("");
    }
  }, [status]);

  const inputClass =
    "bg-[#020618] py-2.5 px-2 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]";

  const countries = useMemo(() => countryList().getData(), []);

  const countryOptions = useMemo(
    () =>
      countries.map((c) => {
        let code = "";
        try {
          code = `+${getCountryCallingCode(c.value)}`;
        } catch {
          code = "";
        }
        return { ...c, code };
      }),
    [countries],
  );

  useEffect(() => {
    if (!phoneInput) {
      setPhoneNumber("");
      return;
    }
    const cleanDigits = phoneInput.startsWith("+")
      ? phoneInput
      : phoneInput.replace(/^0+/, "");
    const formatted = new AsYouType(country).input(cleanDigits);
    let callingCode = "";
    try {
      callingCode = `+${getCountryCallingCode(country)}`;
    } catch {
      callingCode = "";
    }
    const finalVal = phoneInput.startsWith("+")
      ? formatted
      : `${callingCode} ${formatted}`.trim();
    setPhoneNumber(finalVal);
  }, [country, phoneInput, setPhoneNumber]);

  const handleCountryChange = (e) => {
    setCountry(e.target.value);
  };
  const handlePhoneNumberChange = (e) => {
    setPhoneInput(e.target.value);
  };

  return (
    <div className="border-b md:border-b-0 md:border-r border-[#4B576D] w-full flex items-center justify-center py-10 px-4 sm:px-8 md:py-0">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[24rem] flex flex-col gap-6 sm:gap-8"
      >
        <label className="flex flex-col gap-1.5">
          <p style={{ color: gray }}>_Name</p>
          <input
            className={inputClass}
            type="text"
            placeholder="Mohammad"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <p style={{ color: gray }}>_Phone-Number</p>
          <div className="flex gap-2">
            <select
              className={`bg-[#020618] py-2.5 px-2 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md 
                 text-[#90a1b9c7] w-[90px] shrink-0 text-[13px] cursor-pointer`}
              value={country}
              onChange={handleCountryChange}
            >
              {countryOptions.map((c) => (
                <option
                  className="bg-[#020618] text-[#90A1B9] "
                  key={c.value}
                  value={c.value}
                >
                  {c.value} {c.code}
                </option>
              ))}
            </select>
            <input
              className={`${inputClass} min-w-0 flex-1`}
              type="tel"
              placeholder="9150669620"
              value={phoneInput}
              onChange={handlePhoneNumberChange}
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <p style={{ color: gray }}>_Message</p>
          <textarea
            className={`${inputClass} h-28 resize-none`}
            placeholder="E-commerce website"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <button
          id="sendBtn"
          type="submit"
          disabled={status === "sending"}
          className="w-full py-2.5 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Sending..." : "Send-message"}
        </button>

        {statusMessage && (
          <p
            className={`text-[12px] -mt-3 ${
              status === "error" ? "text-[#FF6B6B]" : "text-[#4ADE80]"
            }`}
          >
            // {statusMessage}
          </p>
        )}
      </form>
    </div>
  );
}
