import { useMemo, useState } from "react";
import { useLang } from "../LanguageContext";
import { helpTopics } from "../helpContent";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";

export default function HelpPanel({
  onBack,
  onNavigate
}) {
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");
  const [openTopic, setOpenTopic] = useState(null);
  const topics = helpTopics[lang] || helpTopics.en;

  const filteredTopics = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    if (!term) return topics;

    return topics.filter(topic =>
      [
        topic.category,
        topic.question,
        topic.summary,
        ...topic.steps
      ].some(value =>
        String(value)
          .toLocaleLowerCase()
          .includes(term)
      )
    );
  }, [search, topics]);

  return (
    <div style={shell}>
      <div style={header}>
        <div>
          <div style={eyebrow}>
            {t("help_eyebrow")}
          </div>
          <h2 style={title}>
            {t("help_center")}
          </h2>
          <p style={intro}>
            {t("help_intro")}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          style={btnSecondary}
        >
          {t("back")}
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={event =>
          setSearch(event.target.value)
        }
        placeholder={t("help_search_placeholder")}
        aria-label={t("help_search_placeholder")}
        style={searchInput}
      />

      <div style={topicList}>
        {filteredTopics.map(topic => {
          const open = openTopic === topic.id;

          return (
            <article
              key={topic.id}
              style={topicCard}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenTopic(
                    open ? null : topic.id
                  )
                }
                aria-expanded={open}
                style={questionButton}
              >
                <span>
                  <span style={category}>
                    {topic.category}
                  </span>
                  <strong style={question}>
                    {topic.question}
                  </strong>
                  <span style={summary}>
                    {topic.summary}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  style={chevron}
                >
                  {open ? "−" : "+"}
                </span>
              </button>

              {open && (
                <div style={answer}>
                  <ol style={steps}>
                    {topic.steps.map(step => (
                      <li key={step}>
                        {step}
                      </li>
                    ))}
                  </ol>

                  <div style={actions}>
                    {topic.target && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(topic.target)
                        }
                        style={btnPrimary}
                      >
                        {t("help_take_me_there")}
                      </button>
                    )}

                    {topic.videoUrl && (
                      <a
                        href={topic.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={videoLink}
                      >
                        {t("help_watch_tutorial")}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {filteredTopics.length === 0 && (
          <div style={emptyState}>
            {t("help_no_results")}
          </div>
        )}
      </div>
    </div>
  );
}

const shell = {
  padding: 16,
  flex: 1,
  height: "100%",
  minHeight: 0,
  overflowY: "auto",
  boxSizing: "border-box"
};
const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18
};
const eyebrow = {
  color: "#ff9a57",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".06em"
};
const title = {
  margin: "5px 0 6px",
  color: COLORS.text
};
const intro = {
  maxWidth: 720,
  margin: 0,
  color: COLORS.textDim,
  lineHeight: 1.5
};
const searchInput = {
  ...input,
  width: "100%",
  maxWidth: 720,
  marginBottom: 16
};
const topicList = {
  display: "grid",
  gap: 10,
  maxWidth: 920,
  paddingBottom: 32
};
const topicCard = {
  ...card,
  padding: 0,
  overflow: "hidden"
};
const questionButton = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 16,
  padding: 16,
  border: 0,
  background: "transparent",
  color: COLORS.text,
  textAlign: "left",
  cursor: "pointer"
};
const category = {
  display: "block",
  color: COLORS.primary,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  marginBottom: 4
};
const question = {
  display: "block",
  fontSize: 16
};
const summary = {
  display: "block",
  color: COLORS.textDim,
  lineHeight: 1.4,
  marginTop: 5
};
const chevron = {
  color: COLORS.primary,
  fontSize: 26,
  lineHeight: 1
};
const answer = {
  padding: "0 16px 16px",
  borderTop: "1px solid " + COLORS.border
};
const steps = {
  margin: "14px 0",
  paddingLeft: 22,
  color: COLORS.text,
  lineHeight: 1.55
};
const actions = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10
};
const videoLink = {
  color: COLORS.primary,
  fontWeight: 800,
  textDecoration: "none"
};
const emptyState = {
  ...card,
  color: COLORS.textDim,
  textAlign: "center",
  padding: 24
};
