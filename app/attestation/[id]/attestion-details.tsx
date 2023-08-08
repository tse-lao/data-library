"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SchemaForm from "@/components/core/attestation/schema/schema-form";
import Loading from "@/components/core/loading/loading";
import { CONTRACTS } from "@/constants/contracts";
import { ReloadIcon } from "@radix-ui/react-icons";
import axios from "axios";
import { useEffect, useState } from "react";
import { useContractWrite } from "wagmi";
import AttestionData from "./attestion-table/attestion-data";
import ResolveData from "./resolve-table/resolve-data";

export type Attestion = {
  attester: string;
  data:string
  decodedDataJson:string;
  expirationTime:string;
  ipfsHash:string;
  id:string;
  isOffchain:boolean;
  recipient:string;
  refUID:string;
  revocable:true
  revocationTime:number;
  revoked:string;
  schemaId:string;
  time:number;
  timeCreated:number;
  txid:string;
};

export default function AttestionDetails({
  attestations,
  id,
  schema,
  hasAccess,
  details
}: {
  attestations: any;
  id: string;
  schema: any;
  hasAccess: any;
  details:any;
}) {
  const {
    isLoading: resolveLoading,
    write: resolve,
  } = useContractWrite({
    address: CONTRACTS.attestation.optimistic.contract,
    abi: CONTRACTS.attestation.optimistic.abi,
    functionName: "resolveAttestations",
  });
  const {
    isLoading: splitLoading,
    write: splitFunds,
  } = useContractWrite({
    address: CONTRACTS.attestation.optimistic.contract,
    abi: CONTRACTS.attestation.optimistic.abi,
    functionName: "splitMintingFunds",
  });

  const [data, setData] = useState<Attestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      const baseURL = `https://optimism-goerli.easscan.org/graphql`;
      const response = await axios.post<any>(
        `${baseURL}/graphql`,
        {
          query: `query FindFirstSchema($where: SchemaWhereUniqueInput!) {
                getSchema(where: $where) {
                  _count {
                    attestations
                  }
                  creator
                  id
                  index
                  resolver
                  revocable
                  schema
                  txid
                  time
                  attestations {
                    attester
                    data
                    decodedDataJson
                    expirationTime
                    ipfsHash
                    id
                    isOffchain
                    recipient
                    refUID
                    revocable
                    revocationTime
                    revoked
                    schemaId
                    time
                    timeCreated
                    txid
                  }
                }
              }`,
          variables: {
            where: {
              id: id,
            },
          },
        },
        {
          headers: {
            "content-type": "application/json",
          },
        }
      );

      let attestationsList = response.data.data.getSchema.attestations;
      const newTimestamp = new Date().getTime();
      const resolutionTime = 1000 * 60 * 60 * 24 * 30;
      for (let i = 0; i < attestationsList.length; i++) {
        if (attestationsList.timeCreated + resolutionTime < newTimestamp) {
          attestationsList.splice(i, 1);
        }
      }
      setData(response.data.data.getSchema.attestations);

      //fix schema
      console.log(response.data.data.getSchema);
      setLoading(false);
    };

    if (id) {
      if (attestations < 1) {
        setLoading(false);
        return;
      }
      getData();
    }
  }, [attestations, id]);

  if(loading) return <Loading />;
  return (
    <Tabs defaultValue="attest" className="w-full flex flex-col items-center">
      <TabsList className="grid max-w-2xl grid-cols-3 mb-4">
        <TabsTrigger value="attest">Attest</TabsTrigger>
        <TabsTrigger value="view">View Attestations</TabsTrigger>
        <TabsTrigger value="revoke">Revoke</TabsTrigger>
      </TabsList>
      <TabsContent value="attest" className="min-w-[300px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-300 tracking-wider font-light">
              Create Attestation
            </CardTitle>
            <CardDescription className="text-white">
              Attestion bond: 1.0 ETH
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <SchemaForm list={schema} schemaUID={id} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="view" className="w-full">
        {hasAccess.attest ? <AttestionData /> : <div>No access </div>}
      </TabsContent>
      <TabsContent value="revoke" className="w-full">
        {hasAccess.revoke ? (
          <div>
            <ResolveData id={id} attestations={attestations} />
            <div className="grid grid-cols-2 gap-8">
              <Button
                onClick={() => {
                  resolve();
                }}
                disabled={resolveLoading}
              >
                {resolveLoading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Resolving...
                  </>
                ) : (
                  "Resolve Attestations"
                )}
              </Button>
              <Button
                onClick={() => {
                  splitFunds();
                }}
                disabled={splitLoading}
              >
                {splitLoading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Splitting...
                  </>
                ) : (
                  "Splitting Funds"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <span>No access </span>
        )}
      </TabsContent>
    </Tabs>
  );
}
