export declare let parserConfig: {
    dontIncludeJudgeComments: boolean;
    dontParseTags: boolean;
};
export declare const setParserConfig: (config: typeof parserConfig) => void;
export declare const githubParams: {
    method: string;
    headers: {
        Accept: string;
        Authorization: string;
    };
};
