models_to_append = """
class NodalOfficerJurisdiction(Base):
    __tablename__ = "nodal_officer_jurisdictions"
    id = Column(String, primary_key=True, default=generate_uuid)
    nodal_officer_id = Column(String, ForeignKey("users.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    assigned_by = Column(String, ForeignKey("users.id"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class DHCircular(Base, SoftDeleteMixin):
    __tablename__ = "dh_circulars"
    id = Column(String, primary_key=True, default=generate_uuid)
    issued_by = Column(String, ForeignKey("users.id"))
    title = Column(String)
    content = Column(Text)
    document_url = Column(String)
    issued_date = Column(DateTime(timezone=True), server_default=func.now())
    deadline = Column(DateTime(timezone=True), nullable=True)
    target_colleges = Column(JSONB) # list of college_ids or "all"
    is_mandatory = Column(Boolean, default=True)

class CircularAcknowledgment(Base):
    __tablename__ = "circular_acknowledgments"
    id = Column(String, primary_key=True, default=generate_uuid)
    circular_id = Column(String, ForeignKey("dh_circulars.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    acknowledged_by = Column(String, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime(timezone=True), server_default=func.now())

class DHSubmissionRequirement(Base, SoftDeleteMixin):
    __tablename__ = "dh_submission_requirements"
    id = Column(String, primary_key=True, default=generate_uuid)
    nodal_officer_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    data_type = Column(String) # enrollment, faculty, placement, fees, other
    deadline = Column(DateTime(timezone=True))
    target_colleges = Column(JSONB)

class DHSubmissionRecord(Base):
    __tablename__ = "dh_submission_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    requirement_id = Column(String, ForeignKey("dh_submission_requirements.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    submitted_by = Column(String, ForeignKey("users.id"))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    submission_url = Column(String)
    status = Column(String) # pending, submitted, accepted, rejected
    rejection_reason = Column(String, nullable=True)

class InspectionRecord(Base):
    __tablename__ = "inspection_records"
    id = Column(String, primary_key=True, default=generate_uuid)
    nodal_officer_id = Column(String, ForeignKey("users.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    inspection_date = Column(DateTime(timezone=True))
    inspection_type = Column(String) # routine, surprise, NAAC_prep, complaint_based
    team_members = Column(JSONB)
    findings = Column(JSONB)
    action_points = Column(JSONB)
    compliance_score = Column(Float)
    status = Column(String) # draft, finalized, college_responded

class InspectionResponse(Base):
    __tablename__ = "inspection_responses"
    id = Column(String, primary_key=True, default=generate_uuid)
    inspection_id = Column(String, ForeignKey("inspection_records.id"))
    college_id = Column(String, ForeignKey("colleges.id"))
    response_by = Column(String, ForeignKey("users.id"))
    response_text = Column(Text)
    response_date = Column(DateTime(timezone=True), server_default=func.now())

class ActivityPermission(Base, SoftDeleteMixin):
    __tablename__ = "activity_permissions"
    id = Column(String, primary_key=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id"))
    student_id = Column(String, ForeignKey("users.id"))
    activity_type = Column(String)
    description = Column(Text)
    requested_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String)
    principal_noted_at = Column(DateTime(timezone=True), nullable=True)
    nodal_acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    nodal_notes = Column(Text, nullable=True)

"""

import sys
file_path = r"C:\AcadMix\backend\models.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "class NodalOfficerJurisdiction" not in content:
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(models_to_append)
    print("Appended nodal models to models.py")
else:
    print("already exists")
