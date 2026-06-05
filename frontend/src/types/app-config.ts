export interface DBColumn {
    name: string;
    type: string;
    primary_key: boolean;
    nullable: boolean;
    unique: boolean;
    references?: string;
}

export interface DBTable {
    name: string;
    columns: DBColumn[];
}

export interface DBSchema {
    tables: DBTable[];
    relationships: string[];
}

export interface APIEndpoint {
    method: string;
    path: string;
    summary: string;
    request_body?: any;
    response_body?: any;
    auth_required: boolean;
    validation_rules: string[];
}

export interface APISchema {
    endpoints: APIEndpoint[];
}

export interface UIComponent {
    type: string;
    props: any;
    content?: string;
}

export interface UIPage {
    name: string;
    route: string;
    components: UIComponent[];
}

export interface UISchema {
    pages: UIPage[];
}

export interface Permission {
    action: string;
    resource: string;
}

export interface AuthRole {
    name: string;
    permissions: Permission[];
}

export interface AuthSchema {
    roles: AuthRole[];
    matrix: Record<string, string[]>;
}

export interface RulesSchema {
    rules: any[];
}

export interface AppConfig {
    project_name: string;
    intent: string;
    architecture: {
        entities: any[];
        description: string;
    };
    db: DBSchema;
    api: APISchema;
    ui: UISchema;
    auth: AuthSchema;
    rules: RulesSchema;
}

export interface PipelineStage {
    name: string;
    status: "waiting" | "running" | "success" | "failed";
    output?: any;
    errors: string[];
}

export interface PipelineStatus {
    stages: PipelineStage[];
    current_stage: string;
    progress: number;
}
