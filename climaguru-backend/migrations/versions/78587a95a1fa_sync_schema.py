"""sync_schema

Revision ID: 78587a95a1fa
Revises: 281e30e1c663
Create Date: 2026-02-15 14:45:03.064959

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '78587a95a1fa'
down_revision = '281e30e1c663'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    # 1. SESIONES
    if 'sesiones' not in tables:
        op.create_table('sesiones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('fecha_expiracion', sa.DateTime(), nullable=False),
        sa.Column('activa', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
        with op.batch_alter_table('sesiones', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_sesiones_activa'), ['activa'], unique=False)
            batch_op.create_index(batch_op.f('ix_sesiones_token'), ['token'], unique=True)
            batch_op.create_index(batch_op.f('ix_sesiones_usuario_id'), ['usuario_id'], unique=False)

    # Helper function to get existing constraints/indexes
    def get_existing(table_name):
        fks = [fk['name'] for fk in insp.get_foreign_keys(table_name)]
        indexes = [idx['name'] for idx in insp.get_indexes(table_name)]
        columns = [col['name'] for col in insp.get_columns(table_name)]
        # unique constraints
        ucs = [uc['name'] for uc in insp.get_unique_constraints(table_name)]
        return fks, indexes, columns, ucs

    # 2. API_KEYS
    if 'api_keys' in tables:
        fks, indexes, columns, ucs = get_existing('api_keys')
        with op.batch_alter_table('api_keys', schema=None) as batch_op:
            # Drop FKs FIRST
            if 'api_keys_ibfk_1' in fks:
                batch_op.drop_constraint('api_keys_ibfk_1', type_='foreignkey')
            
            # Then Drop Indexes
            if 'unique_proveedor_usuario' in indexes:
                batch_op.drop_index('unique_proveedor_usuario')
            if 'idx_proveedor' in indexes:
                batch_op.drop_index('idx_proveedor')
            if 'idx_activa' in indexes:
                batch_op.drop_index('idx_activa')

            # Add Columns
            if 'servicio_nombre' not in columns:
                batch_op.add_column(sa.Column('servicio_nombre', sa.String(length=50), nullable=False))
            if 'api_key' not in columns:
                batch_op.add_column(sa.Column('api_key', sa.String(length=255), nullable=False))
            if 'fecha_registro' not in columns:
                batch_op.add_column(sa.Column('fecha_registro', sa.DateTime(), nullable=True))
            if 'fecha_actualizacion' not in columns:
                batch_op.add_column(sa.Column('fecha_actualizacion', sa.DateTime(), nullable=True))

            # Create Indexes
            if 'ix_api_keys_usuario_id' not in indexes:
                batch_op.create_index(batch_op.f('ix_api_keys_usuario_id'), ['usuario_id'], unique=False)
            
            # Drops Columns
            for col in ['api_secret_encrypted', 'actualizada_en', 'descripcion', 'proveedor', 
                        'creada_en', 'consultas_realizadas', 'limite_consultas_diarias', 
                        'ultimo_uso', 'api_key_encrypted']:
                if col in columns:
                    batch_op.drop_column(col)

            # Create FKs
            batch_op.create_foreign_key(None, 'usuarios', ['usuario_id'], ['id'])
            
            # Create Constraints
            if 'unique_user_service' not in ucs:
                batch_op.create_unique_constraint('unique_user_service', ['usuario_id', 'servicio_nombre'])

    # 3. CIUDADES_FAVORITAS
    if 'ciudades_favoritas' in tables:
        fks, indexes, columns, ucs = get_existing('ciudades_favoritas')
        with op.batch_alter_table('ciudades_favoritas', schema=None) as batch_op:
            batch_op.alter_column('creada_en',
                existing_type=mysql.TIMESTAMP(),
                type_=sa.DateTime(),
                existing_nullable=True,
                existing_server_default=sa.text('current_timestamp()'))
            
            # Drop FKs FIRST
            if 'ciudades_favoritas_ibfk_1' in fks:
                batch_op.drop_constraint('ciudades_favoritas_ibfk_1', type_='foreignkey')
            
            # Then Indexes
            if 'idx_usuario' in indexes:
                batch_op.drop_index('idx_usuario')
            
            if 'ix_ciudades_favoritas_usuario_id' not in indexes:
                batch_op.create_index(batch_op.f('ix_ciudades_favoritas_usuario_id'), ['usuario_id'], unique=False)
            
            batch_op.create_foreign_key(None, 'usuarios', ['usuario_id'], ['id'])

    # 4. CONSULTAS
    if 'consultas' in tables:
        fks, indexes, columns, ucs = get_existing('consultas')
        with op.batch_alter_table('consultas', schema=None) as batch_op:
            # Drop FKs FIRST
            if 'consultas_ibfk_1' in fks:
                batch_op.drop_constraint('consultas_ibfk_1', type_='foreignkey')

            batch_op.alter_column('creada_en',
                existing_type=mysql.TIMESTAMP(),
                type_=sa.DateTime(),
                existing_nullable=True,
                existing_server_default=sa.text('current_timestamp()'))
            
            # Then Indexes
            for idx in ['idx_ciudad', 'idx_coordenadas', 'idx_creada', 'idx_estado', 'idx_tipo', 'idx_usuario']:
                if idx in indexes:
                    batch_op.drop_index(idx)
            
            new_indexes = [
                ('ix_consultas_ciudad', ['ciudad']),
                ('ix_consultas_creada_en', ['creada_en']),
                ('ix_consultas_estado', ['estado']),
                ('ix_consultas_latitud', ['latitud']),
                ('ix_consultas_longitud', ['longitud']),
                ('ix_consultas_tipo_consulta', ['tipo_consulta']),
                ('ix_consultas_usuario_id', ['usuario_id'])
            ]
            for name, cols in new_indexes:
                if name not in indexes:
                    batch_op.create_index(batch_op.f(name), cols, unique=False)

            batch_op.create_foreign_key(None, 'usuarios', ['usuario_id'], ['id'])

    # 5. DATOS_CLIMA
    if 'datos_clima' in tables:
        fks, indexes, columns, ucs = get_existing('datos_clima')
        with op.batch_alter_table('datos_clima', schema=None) as batch_op:
            # Drop FKs FIRST
            if 'datos_clima_ibfk_1' in fks:
                batch_op.drop_constraint('datos_clima_ibfk_1', type_='foreignkey')

            batch_op.alter_column('guardado_en',
                existing_type=mysql.TIMESTAMP(),
                type_=sa.DateTime(),
                existing_nullable=True,
                existing_server_default=sa.text('current_timestamp()'))
            
            if 'idx_fecha' in indexes:
                batch_op.drop_index('idx_fecha')
            if 'idx_temperatura' in indexes:
                batch_op.drop_index('idx_temperatura')
            
            batch_op.create_foreign_key(None, 'consultas', ['consulta_id'], ['id'])

    # 6. LOGS_ACTIVIDAD
    if 'logs_actividad' in tables:
        fks, indexes, columns, ucs = get_existing('logs_actividad')
        with op.batch_alter_table('logs_actividad', schema=None) as batch_op:
            # Drop FKs FIRST
            if 'logs_actividad_ibfk_1' in fks:
                batch_op.drop_constraint('logs_actividad_ibfk_1', type_='foreignkey')

            batch_op.alter_column('creado_en',
                existing_type=mysql.TIMESTAMP(),
                type_=sa.DateTime(),
                existing_nullable=True,
                existing_server_default=sa.text('current_timestamp()'))
            
            for idx in ['idx_accion', 'idx_fecha', 'idx_usuario']:
                if idx in indexes:
                    batch_op.drop_index(idx)
            
            if 'ix_logs_actividad_accion' not in indexes:
                batch_op.create_index(batch_op.f('ix_logs_actividad_accion'), ['accion'], unique=False)
            if 'ix_logs_actividad_creado_en' not in indexes:
                batch_op.create_index(batch_op.f('ix_logs_actividad_creado_en'), ['creado_en'], unique=False)
            
            batch_op.create_foreign_key(None, 'usuarios', ['usuario_id'], ['id'])

    # 7. USUARIOS
    if 'usuarios' in tables:
        fks, indexes, columns, ucs = get_existing('usuarios')
        with op.batch_alter_table('usuarios', schema=None) as batch_op:
            if 'fecha_registro' not in columns:
                batch_op.add_column(sa.Column('fecha_registro', sa.DateTime(), nullable=True))
            if 'ultimo_acceso' not in columns:
                batch_op.add_column(sa.Column('ultimo_acceso', sa.DateTime(), nullable=True))
            
            batch_op.alter_column('creado_en',
                existing_type=mysql.TIMESTAMP(),
                type_=sa.DateTime(),
                existing_nullable=True,
                existing_server_default=sa.text('current_timestamp()'))
            batch_op.alter_column('actualizado_en',
                existing_type=mysql.TIMESTAMP(),
                type_=sa.DateTime(),
                existing_nullable=True,
                existing_server_default=sa.text('current_timestamp() ON UPDATE current_timestamp()'))
            
            for idx in ['email', 'idx_email', 'idx_rol', 'idx_username', 'username']:
                if idx in indexes:
                    batch_op.drop_index(idx)
            
            if 'ix_usuarios_email' not in indexes:
                batch_op.create_index(batch_op.f('ix_usuarios_email'), ['email'], unique=True)
            if 'ix_usuarios_username' not in indexes:
                batch_op.create_index(batch_op.f('ix_usuarios_username'), ['username'], unique=True)


def downgrade():
    pass
