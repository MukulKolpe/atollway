import type { NextPage } from "next";
import { IssuerConsole } from "~~/components/atollway/issuer/IssuerConsole";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Issuer",
  description: "Approve investors, manage spokes and set the NAV.",
});

const Issuer: NextPage = () => {
  return <IssuerConsole />;
};

export default Issuer;
