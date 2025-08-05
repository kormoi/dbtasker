module.exports = {
    "main": {
      "users": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false,
          "comment": "Primary Key"
        },
        "ac_status": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'registered', 'requested', 'approved', 'rejected', 'suspended', 'restricted', 'blocked', 'deleted'"
          },
          "NULL": false,
          "DEFAULT": "registered"
        },
        "user_role": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'admin', 'back_end_dev', 'app_dev', 'front_end_dev', 'employee', 'marketer', 'support', 'higher_support', 'advocate', 'user'"
          },
          "NULL": false,
          "DEFAULT": "user"
        },
        "first_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 60
          },
          "NULL": false
        },
        "last_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": false
        },
        "display_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "bio": {
          "type": {
            "name": "TEXT"
          },
          "NULL": false
        },
        "profile_title": {
          "type": {
            "name": "jso"
          },
          "NULL": false
        },
        "description": {
          "type": {
            "name": "JSON"
          },
          "NULL": false
        },
        "skills": {
          "type": {
            "name": "TEXT"
          },
          "NULL": false
        },
        "languages": {
          "type": {
            "name": "JSON"
          },
          "NULL": false
        },
        "profile_picture": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "cover_picture": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "seller_level": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'none','starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby', 'sapphire', 'emerald', 'obsidian'"
          },
          "NULL": true,
          "DEFAULT": "none"
        },
        "accoutn_badges": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "List of badges"
        },
        "overall_rating": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": true
        },
        "avg_response_time": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "comment": "Average response time in hours."
        },
        "review_count": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "follow_count": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "following_count": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "ideator_level": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "setting": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "user_identity": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "index": "UNIQUE"
        },
        "username": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 50
          },
          "NULL": true,
          "index": "UNIQUE"
        },
        "custom_url": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": true,
          "index": "UNIQUE"
        },
        "privacy": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "3",
          "comment": "3 = public, 2 = only registered users, 1 = private"
        },
        "password": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "primary_email": {
          "type": {
            "name": "INT"
          },
          "NULL": true
        },
        "primary_phone": {
          "type": {
            "name": "INT"
          },
          "NULL": true
        },
        "two_step_verify": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "two_step_verify_method": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'none', 'email', 'phone'"
          },
          "NULL": false,
          "DEFAULT": "none"
        },
        "blood_group": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'"
          },
          "NULL": true
        },
        "gender": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'male','female','other'"
          },
          "NULL": false
        },
        "date_of_birth": {
          "type": {
            "name": "DATE"
          },
          "NULL": false
        },
        "relationship_status": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'single','married','divorced','widowed','separated'"
          },
          "NULL": false,
          "DEFAULT": "single"
        },
        "time_zone": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "currency": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 5
          },
          "NULL": false
        },
        "country": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 50
          },
          "NULL": false
        },
        "state": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": false
        },
        "city": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": true
        },
        "zip": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": false
        },
        "addressline1": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "addressline2": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "reset_password": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "email": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "code": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 10
          },
          "NULL": false
        },
        "token": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true,
          "index": "UNIQUE"
        },
        "expires_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": true
        },
        "email_sent": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "linked_account": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "provider": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 50
          },
          "NULL": false,
          "comment": "The platform name (google, facebook, github etc.)"
        },
        "provider_user_id": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": false,
          "comment": "The platform user id"
        },
        "token": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "comment": "The platform provided token"
        },
        "full_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "date_of_birth": {
          "type": {
            "name": "DATE"
          },
          "NULL": true
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "ac_preferance": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "work_preferance": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'none','short', 'long', 'both'"
          },
          "NULL": true,
          "comment": "Short, long, both"
        },
        "freelancing_experience": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'beginner', 'intermediate', 'expert', 'some experience'"
          },
          "NULL": false,
          "DEFAULT": "beginner"
        },
        "working_goal": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'main income', 'side income', 'get some experience', 'just exploring'"
          },
          "NULL": false
        },
        "per_hour_rate": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "consultation_time": {
          "type": {
            "name": "INT"
          },
          "NULL": true,
          "DEFAULT": "0",
          "comment": "Give minimum amount of time that you will be consulting in minutes. e.g. 60 min which means 1 hour."
        },
        "consultation_charge": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "hours_perWeek": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "comment": "How many hours do you plan to spend per week"
        },
        "on_time": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "COMMENT": "On time work delivery rate in percentage"
        },
        "on_budget": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "COMMENT": "On budget job completion rate in percentage"
        },
        "job_accept_rate": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "COMMENT": "Likeliness to accept a project"
        },
        "repeat_hire_rate": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "COMMENT": "How many of repeated customere ordered again on percentage."
        },
        "job_release_rate": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "COMMENT": "How many jobs completed after job posted in percentage."
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "investor_preferance": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "investor_level": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'none','short', 'long', 'both'"
          },
          "NULL": true,
          "comment": "Short, long, both"
        },
        "contact_email": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "country_code": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 5
          },
          "NULL": true,
          "comment": "Alpha 2"
        },
        "phone_number": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "office_address": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "Only if available"
        },
        "company_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": true
        },
        "company_address": {
          "type": {
            "name": "JSON"
          },
          "NULL": false
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "freelancer_interest": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "is_seller": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_buyer": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_job_seeker": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_company_owner": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_investor": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "freelancer_countries": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "e.g. {country_name: count}"
        },
        "freelancer_price": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All prices list that clicked and worked with."
        },
        "freelancer_job_types": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All job list that clicked and worked with."
        },
        "client_countries": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "e.g. {country_name: count}"
        },
        "client_price": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All prices list that clicked and worked with."
        },
        "client_job_types": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All job list that clicked and worked with."
        },
        "seller_level_interest": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All job list that clicked and worked with."
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "client_interest": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "is_seller": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_buyer": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_job_seeker": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_company_owner": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "is_investor": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "freelancer_countries": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "e.g. {country_name: count}"
        },
        "freelancer_price": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All prices list that clicked and worked with."
        },
        "freelancer_job_types": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All job list that clicked and worked with."
        },
        "client_countries": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "e.g. {country_name: count}"
        },
        "client_price": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All prices list that clicked and worked with."
        },
        "client_job_types": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All job list that clicked and worked with."
        },
        "seller_level_interest": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All job list that clicked and worked with."
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "investor_interest": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": false,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": true
          }
        },
        "prices": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "All prices list that clicked and worked with."
        },
        "idea_neash": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "Ideas types that you like e.g. technology, agriculture, etc."
        },
        "user_countries": {
          "type": {
            "name": "JSON"
          },
          "NULL": true,
          "comment": "e.g. {country_name: count}"
        },
        "ideator_levels": {
          "type": {
            "name": "TEXT"
          },
          "NULL": true,
          "comment": "Ids of the level of ids"
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "platform_charge": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "payment_type": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "comment": "deposit, withdrawal, payment, payout, platform_charge, subscription_fee, processing_fee, refund, admin_adjustment, challenge_payment, challenge_refund, bonus, reward transfer, dispute_adjustment, penalty, reversal, admin_adjustment, recruiter_payment"
        },
        "charge_percentage": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": 15
        },
        "currency": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 3
          },
          "NULL": false,
          "DEFAULT": "BDT"
        },
        "amount": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "transaction_id": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "balance_after_transaction": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        }
      },
      "category": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": true,
          "comment": "Foreign key referencing users table",
          "foreign_key": {
            "REFERENCES": {
              "table": "users",
              "column": "id"
            },
            "delete": null
          }
        },
        "parent_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": true,
          "comment": "Nullable. References category_id for subcategories. NULL for top-level categories.",
          "foreign_key": {
            "REFERENCES": {
              "table": "category",
              "column": "id"
            },
            "delete": null
          }
        },
        "slug": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "index": "UNIQUE",
          "comment": "Optional. A URL-friendly identifier for the category."
        },
        "category_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "comment": "Name of the category or subcategory."
        },
        "category_type": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'none', 'skills','freelance', 'office_job', 'server'"
          },
          "NULL": false,
          "DEFAULT": "none"
        },
        "status": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'active', 'inactive', 'requested', 'deleted', 'cancel'"
          },
          "comment": "Defines whether the category is currently active or not."
        },
        "available_jobs": {
          "type": {
            "name": "INT"
          },
          "NULL": true,
          "DEFAULT": "0"
        },
        "popularity_score": {
          "type": {
            "name": "INT"
          },
          "NULL": false,
          "DEFAULT": "0",
          "comment": "Score depends on how many project, deal, challenges posted on this skill."
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      }
    },
    "finance":{
      "payment_method": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "payment_method": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'Bank Transfer', 'Mobile Payment', 'PayPal', 'Card'"
          },
          "NULL": false
        },
        "mobile_payNum": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 15
          },
          "NULL": false
        },
        "swift_code": {
          "type": {
            "name": "CHAR",
            "LengthValues": 8
          },
          "NULL": false,
          "comment": "SWIFT code with standard length"
        },
        "account_number": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 20
          },
          "NULL": false
        },
        "post_code": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 20
          },
          "NULL": false
        },
        "account_type": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'personal', 'company'"
          },
          "NULL": false
        },
        "branch_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "branch_address": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "ac_first_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "ac_last_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "ac_date_of_birth": {
          "type": {
            "name": "DATE"
          },
          "NULL": false
        },
        "id_type": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'id', 'passport'"
          },
          "NULL": false,
          "comment": "ID number or Passport number"
        },
        "customer_id": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "name_on_account": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "ac_address": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 500
          },
          "NULL": false,
          "comment": "Physical address associated with this account"
        },
        "city_state": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "country": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "phone": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 15
          },
          "NULL": false
        },
        "is_authorized": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'yes', 'no'"
          },
          "NULL": false,
          "DEFAULT": "no",
          "comment": "Flag indicating ownership and authorization of account"
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "transaction": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "transaction_type": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 100
          },
          "NULL": false
        },
        "transaction_id": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "index": "UNIQUE"
        },
        "reference": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          }
        },
        "amount": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "customer_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "address": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "DEFAULT": "None"
        },
        "payment_method": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "DEFAULT": "None"
        },
        "email": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "DEFAULT": "None"
        },
        "phone": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false,
          "DEFAULT": "None"
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "fund_request": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "from_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": true
        },
        "user_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": true
        },
        "payment_type": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'deposit', 'withdraw', 'spent', 'earning'"
          },
          "NULL": false
        },
        "reason": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'none', 'deposit', 'withdrawal', 'project_payment', 'payout', 'platform_charge', 'subscription_fee', 'processing_fee', 'refund', 'challenge_payment', 'challenge_refund', 'dispute_adjustment', 'reversal', 'admin_adjustment', 'recruiter_payment', 'check_out'"
          },
          "NULL": false
        },
        "table_name": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 50
          },
          "NULL": true
        },
        "row_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": true
        },
        "job_id": {
          "type": {
            "name": "BIGINT"
          },
          "NULL": true
        },
        "request_date": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false
        },
        "transaction_hold_time": {
          "type": {
            "name": "INT"
          },
          "NULL": true,
          "comment": "Transaction hold time in hours"
        },
        "transaction_date": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": true
        },
        "transaction_id": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 255
          },
          "NULL": false
        },
        "currency": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 3
          },
          "NULL": false,
          "DEFAULT": "BDT"
        },
        "amount": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "status": {
          "type": {
            "name": "ENUM",
            "LengthValues": "'pending', 'completed', 'failed', 'cancelled', 'processing', 'reversed', 'on_hold', 'refunded', 'approved', 'rejected'"
          },
          "NULL": false,
          "DEFAULT": "pending"
        },
        "balance_updated": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "invoice_sent": {
          "type": {
            "name": "TINYINT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "remarks": {
          "type": {
            "name": "TEXT"
          },
          "NULL": true
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      },
      "(year)balance": {
        "id": {
          "type": {
            "name": "BIGINT"
          },
          "AUTO_INCREMENT": true,
          "index": "PRIMARY KEY",
          "NULL": false
        },
        "currency": {
          "type": {
            "name": "VARCHAR",
            "LengthValues": 5
          },
          "NULL": false,
          "DEFAULT": "BDT"
        },
        "balance": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "total_earnings": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "total_withdraw": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "total_spent": {
          "type": {
            "name": "FLOAT"
          },
          "NULL": false,
          "DEFAULT": "0"
        },
        "created_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP"
        },
        "updated_at": {
          "type": {
            "name": "TIMESTAMP"
          },
          "NULL": false,
          "DEFAULT": "CURRENT_TIMESTAMP",
          "on_update": "CURRENT_TIMESTAMP"
        }
      }
    }
  }
