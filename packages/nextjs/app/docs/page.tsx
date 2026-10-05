import type { NextPage } from "next";
import { Docs } from "~~/components/atollway/docs/Docs";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Docs",
  description: "How to use the Atollway template, who it is for, and what to build on it.",
});

const DocsPage: NextPage = () => {
  return <Docs />;
};

export default DocsPage;
